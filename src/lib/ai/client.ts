import { ApiError } from "@/lib/api/client";

/**
 * Browser client for the AI "continue writing" endpoint.
 *
 * Yields the model's continuation as decoded text chunks, so the caller can
 * insert tokens into the editor as they stream in (perceived latency ≈ first
 * token, not full completion). Cancellation is cooperative via AbortSignal —
 * aborting closes the HTTP stream, which also stops the server-side generation.
 */
export async function* streamContinuation(
  documentId: string,
  context: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const res = await fetch("/api/ai/continue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId, context }),
    signal,
  });

  if (!res.ok) {
    // Error responses are the JSON envelope, not a stream.
    let message = "AI request failed.";
    let code = "UNKNOWN";
    try {
      const body = (await res.json()) as { message?: string; error?: string };
      message = body.message ?? message;
      code = body.error ?? code;
    } catch {
      // Non-JSON error body — keep the generic message.
    }
    throw new ApiError(message, res.status, code);
  }

  if (!res.body) throw new ApiError("Empty AI response.", 502, "AI_NO_BODY");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // stream:true keeps multi-byte characters intact across chunk borders.
      const text = decoder.decode(value, { stream: true });
      if (text) yield text;
    }
  } finally {
    // Ensure the connection is released on early exit (abort/unmount).
    reader.releaseLock();
  }
}
