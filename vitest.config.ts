import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest configuration.
 *
 * Tests live in `tests/` and exercise the pure logic in `src/lib` (CRDT merge
 * core, RBAC, validation). Coverage is collected from those modules so the
 * report focuses on the logic that matters most for correctness.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/lib/versioning/**",
        "src/lib/rbac/**",
        "src/lib/validation/**",
      ],
    },
  },
  resolve: {
    alias: {
      // Mirror the app's "@/*" -> "src/*" path alias.
      "@": path.resolve(__dirname, "src"),
    },
  },
});
