/**
 * Image helpers for the editor.
 *
 * PHASE 1 STRATEGY: images are embedded as base64 data URLs so they persist in
 * the local Yjs document and render fully offline with no server round-trip.
 *
 * TRADEOFF (documented for Phase 2): base64 inflates document size (~33% over
 * raw bytes) and bloats the CRDT update log. Phase 2 will upload binaries to
 * object storage and embed only the URL, keeping the CRDT small. The size guard
 * below caps embedded images to keep the document — and memory — bounded.
 */

/** Max size for an inline (base64) image. Larger files are rejected in Phase 1. */
export const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

/** Accepted image MIME types. */
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

export interface ImageReadResult {
  ok: boolean;
  dataUrl?: string;
  error?: string;
}

/**
 * Validates and reads a file into a base64 data URL.
 * Returns a structured result instead of throwing so callers can show friendly,
 * accessible error messages.
 */
export function fileToDataUrl(file: File): Promise<ImageReadResult> {
  return new Promise((resolve) => {
    if (!ALLOWED_TYPES.has(file.type)) {
      resolve({ ok: false, error: `Unsupported image type: ${file.type || "unknown"}` });
      return;
    }
    if (file.size > MAX_INLINE_IMAGE_BYTES) {
      resolve({
        ok: false,
        error: `Image is too large (max ${(MAX_INLINE_IMAGE_BYTES / 1024 / 1024).toFixed(0)} MB in offline mode).`,
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve({ ok: true, dataUrl: reader.result as string });
    reader.onerror = () => resolve({ ok: false, error: "Failed to read image file." });
    reader.readAsDataURL(file);
  });
}
