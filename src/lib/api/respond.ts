import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { AppError, ValidationError } from "@/lib/rbac/errors";

/**
 * Maximum accepted JSON body size for metadata endpoints (create/rename/share).
 *
 * SECURITY (OOM defense): large CRDT sync payloads do NOT go through these JSON
 * routes — they go to the realtime server (Phase 2), which has its own stricter
 * frame-size limits. Here we cap small metadata bodies so a malicious client
 * cannot force the server to buffer/parse a huge JSON blob.
 */
export const MAX_JSON_BODY_BYTES = 100 * 1024; // 100 KB

/**
 * Safely reads and validates a JSON request body.
 *
 * Order of checks is deliberate:
 *   1. Reject by Content-Length header before reading anything (cheapest).
 *   2. Reject by actual byte length after reading (header can be spoofed/absent).
 *   3. Parse JSON defensively.
 *   4. Validate shape with the provided Zod schema.
 *
 * `maxBytes` defaults to the tight metadata limit. Routes that legitimately
 * carry large payloads (e.g. CRDT sync, which can include embedded images) pass
 * a higher cap — still bounded, so the OOM protection holds.
 *
 * @throws ValidationError on oversize, malformed JSON, or schema failure.
 */
export async function readJson<T>(
  request: Request,
  schema: ZodSchema<T>,
  maxBytes: number = MAX_JSON_BODY_BYTES,
): Promise<T> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > maxBytes) {
    throw new ValidationError("Request body too large.");
  }

  const raw = await request.text();
  if (raw.length > maxBytes) {
    throw new ValidationError("Request body too large.");
  }

  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    throw new ValidationError("Invalid JSON body.");
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new ValidationError("Validation failed.", result.error.flatten());
  }
  return result.data;
}

/** Convenience success responder. */
export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

/**
 * Central error → HTTP mapper. Every route handler funnels failures here so
 * status codes and the response envelope stay consistent, and unexpected errors
 * never leak internal details to the client.
 */
export function handleError(err: unknown): NextResponse {
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      error: err.code,
      message: err.message,
    };
    if (err instanceof ValidationError && err.details) {
      body.details = err.details;
    }
    return NextResponse.json(body, { status: err.status });
  }

  // Defensive: a Zod error that slipped through without wrapping.
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: err.flatten() },
      { status: 400 },
    );
  }

  // Unknown/unexpected: log server-side, return a generic message.
  console.error("[api] Unhandled error:", err);
  return NextResponse.json(
    { error: "INTERNAL", message: "Something went wrong." },
    { status: 500 },
  );
}
