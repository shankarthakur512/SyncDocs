import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton.
 *
 * In development, Next.js hot-reloading re-evaluates modules frequently. Without
 * caching the client on `globalThis`, each reload would open a brand-new pool of
 * database connections and quickly exhaust the database's connection limit.
 * In production a single instance is created per server process.
 */

// Augment the global type so the cached client is typed.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Verbose query logging in dev only; quiet (errors only) in production.
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
