import { z } from "zod";

/**
 * Validation + hard size limits for sync/version payloads.
 *
 * SECURITY (OOM defense): CRDT blobs are the one place a client could try to
 * send something huge. We cap the base64 string length BEFORE decoding so the
 * server never allocates a giant buffer, and we verify the string is valid
 * base64 so `Buffer.from` can't be fed garbage. The cap is generous enough for
 * real documents but bounds worst-case memory per request.
 */

// Per base64 field cap. Generous enough for documents with embedded images
// (which inflate the CRDT state), but still bounded to protect memory.
export const MAX_CRDT_BASE64_LENGTH = 12 * 1024 * 1024; // ~9 MB binary

/**
 * Whole-request cap for the sync endpoint (the `update` + `stateVector` fields
 * plus JSON overhead). Passed to `readJson` so large-but-bounded CRDT payloads
 * are accepted while still preventing OOM via an unbounded body.
 */
export const MAX_SYNC_BODY_BYTES = 16 * 1024 * 1024; // ~16 MB

const base64Blob = z
  .string()
  .max(MAX_CRDT_BASE64_LENGTH, "CRDT payload too large.")
  // Standard base64 alphabet with optional padding.
  .regex(/^[A-Za-z0-9+/]*={0,2}$/, "Payload is not valid base64.");

/** POST /api/documents/[id]/sync */
export const syncSchema = z.object({
  update: base64Blob,
  stateVector: base64Blob.optional(),
});

/** POST /api/documents/[id]/versions */
export const saveVersionSchema = z.object({
  label: z.string().trim().max(200).optional(),
  kind: z.enum(["MANUAL", "AUTO"]).default("MANUAL"),
});

export type SyncInput = z.infer<typeof syncSchema>;
export type SaveVersionInput = z.infer<typeof saveVersionSchema>;
