import { z } from "zod";

/**
 * Zod request schemas.
 *
 * Validating EVERY incoming payload at the boundary is a core security control:
 * it rejects malformed/oversized input before it reaches the database or the
 * business logic, and gives precise, safe error messages. Bounded string
 * lengths also help prevent resource-exhaustion via giant fields.
 */

// A document title: trimmed, non-empty, length-bounded.
const titleSchema = z
  .string()
  .trim()
  .min(1, "Title cannot be empty.")
  .max(200, "Title is too long (max 200 characters).");

/** POST /api/documents — title is optional (defaults applied server-side). */
export const createDocumentSchema = z.object({
  title: titleSchema.optional(),
});

/** PATCH /api/documents/[id] — rename. */
export const updateDocumentSchema = z.object({
  title: titleSchema,
});

/**
 * POST /api/documents/[id]/members — invite a collaborator.
 * OWNER is intentionally NOT assignable via invite; ownership transfer is a
 * separate, deliberate operation.
 */
export const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("A valid email is required."),
  role: z.enum(["EDITOR", "VIEWER"]),
});

/** PATCH /api/documents/[id]/members/[userId] — change a collaborator's role. */
export const updateMemberSchema = z.object({
  role: z.enum(["OWNER", "EDITOR", "VIEWER"]),
});

// Inferred TypeScript types for use in handlers.
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
