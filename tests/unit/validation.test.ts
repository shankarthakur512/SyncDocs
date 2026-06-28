import { describe, it, expect } from "vitest";
import {
  syncSchema,
  saveVersionSchema,
  MAX_CRDT_BASE64_LENGTH,
} from "@/lib/versioning/validation";

/**
 * Tests for payload validation / size caps — the boundary that protects the
 * server from malformed or oversized CRDT payloads (OOM defense).
 */

describe("syncSchema", () => {
  it("accepts a valid base64 update", () => {
    expect(syncSchema.safeParse({ update: "AAAA" }).success).toBe(true);
  });

  it("rejects non-base64 input", () => {
    expect(syncSchema.safeParse({ update: "not valid !!!" }).success).toBe(
      false,
    );
  });

  it("rejects payloads over the size cap", () => {
    const tooBig = "A".repeat(MAX_CRDT_BASE64_LENGTH + 4);
    expect(syncSchema.safeParse({ update: tooBig }).success).toBe(false);
  });
});

describe("saveVersionSchema", () => {
  it("defaults kind to MANUAL", () => {
    const parsed = saveVersionSchema.parse({});
    expect(parsed.kind).toBe("MANUAL");
  });

  it("rejects an unknown kind", () => {
    expect(saveVersionSchema.safeParse({ kind: "WEEKLY" }).success).toBe(false);
  });
});
