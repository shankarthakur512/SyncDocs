import { describe, it, expect } from "vitest";
import { can, hasAtLeast } from "@/lib/rbac/roles";

/**
 * Tests for the RBAC permission matrix — the rules that gate every action.
 * The headline assertion: VIEWERs cannot write (the rule the realtime server
 * also enforces), and only OWNERs can manage members.
 */

describe("can() permission matrix", () => {
  it("lets editors and owners write, but not viewers", () => {
    expect(can("VIEWER", "document:write")).toBe(false);
    expect(can("EDITOR", "document:write")).toBe(true);
    expect(can("OWNER", "document:write")).toBe(true);
  });

  it("lets everyone read", () => {
    expect(can("VIEWER", "document:read")).toBe(true);
    expect(can("EDITOR", "document:read")).toBe(true);
    expect(can("OWNER", "document:read")).toBe(true);
  });

  it("restricts member management and deletion to owners", () => {
    expect(can("EDITOR", "members:manage")).toBe(false);
    expect(can("OWNER", "members:manage")).toBe(true);
    expect(can("EDITOR", "document:delete")).toBe(false);
    expect(can("OWNER", "document:delete")).toBe(true);
  });
});

describe("hasAtLeast() role ranking", () => {
  it("ranks OWNER > EDITOR > VIEWER", () => {
    expect(hasAtLeast("OWNER", "EDITOR")).toBe(true);
    expect(hasAtLeast("EDITOR", "EDITOR")).toBe(true);
    expect(hasAtLeast("VIEWER", "EDITOR")).toBe(false);
  });
});
