import type { Role } from "@prisma/client";

/**
 * RBAC role model.
 *
 * Roles are ranked so that a higher rank implies all permissions of the lower
 * ranks (OWNER ⊇ EDITOR ⊇ VIEWER). Comparing ranks lets us express rules like
 * "requires at least EDITOR" with a single numeric check.
 */
export const ROLE_RANK: Record<Role, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

/**
 * Permissions are verbs the UI/API care about. Keeping them abstract (rather
 * than checking raw roles everywhere) means access rules live in ONE matrix and
 * the rest of the code asks "can this role do X?".
 */
export type Permission =
  | "document:read" // open/view content
  | "document:write" // edit content / push sync updates
  | "document:update-meta" // rename, change settings
  | "document:delete" // delete the document
  | "members:read" // see collaborators
  | "members:manage"; // invite/remove/change roles

/**
 * The authoritative permission matrix.
 *
 * IMPORTANT (assignment requirement): VIEWER intentionally lacks
 * `document:write`, which is the permission the realtime server checks before
 * accepting a sync update — so viewers can never push state changes.
 */
const PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  VIEWER: new Set<Permission>(["document:read", "members:read"]),
  EDITOR: new Set<Permission>([
    "document:read",
    "document:write",
    "members:read",
  ]),
  OWNER: new Set<Permission>([
    "document:read",
    "document:write",
    "document:update-meta",
    "document:delete",
    "members:read",
    "members:manage",
  ]),
};

/** Returns true if `role` is allowed to perform `permission`. */
export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role].has(permission);
}

/** Returns true if `role` is at least as privileged as `minimum`. */
export function hasAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
