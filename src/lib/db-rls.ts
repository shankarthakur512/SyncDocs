import { prisma } from "@/lib/db";
import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Runs `callback` inside a transaction with the PostgreSQL session variable
 * `app.current_user_id` set to the given user id, so that Row Level Security
 * policies (see prisma/rls/enable-rls.sql) evaluate against the real caller.
 *
 * USAGE (only meaningful once RLS is enabled):
 *   const docs = await withUserContext(userId, (tx) =>
 *     tx.document.findMany()
 *   );
 *
 * Notes:
 *  - `SET LOCAL` scopes the variable to this transaction only, so concurrent
 *    requests on other connections are unaffected (no cross-request leakage).
 *  - The user id is passed as a parameter to avoid SQL injection.
 *  - When RLS is NOT enabled this still works correctly; it simply has no extra
 *    effect beyond the normal transaction.
 */
export function withUserContext<T>(
  userId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Parameterised SET LOCAL — value is safely escaped by Prisma.
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
    return callback(tx);
  });
}

/** Re-export for convenience in callers that also need the base client type. */
export type { PrismaClient };
