import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import {
  toBase64,
  fromBase64,
  emptyState,
  encodeState,
  mergeState,
  revertContent,
  docFromState,
} from "@/lib/versioning/crdt";

/*
* Testing the crdt.ts file
*/

describe("base64 round-trip", () => {
  it("encodes and decodes bytes losslessly", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255, 128, 42]);
    expect(Array.from(fromBase64(toBase64(bytes)))).toEqual(Array.from(bytes));
  });
});

describe("mergeState", () => {
  it("converges deterministically regardless of merge order", () => {
    const d1 = new Y.Doc();
    d1.getText("t").insert(0, "A");
    const d2 = new Y.Doc();
    d2.getText("t").insert(0, "B");

    const s1 = encodeState(d1);
    const s2 = encodeState(d2);

    const order12 = docFromState(mergeState(s1, s2)).getText("t").toString();
    const order21 = docFromState(mergeState(s2, s1)).getText("t").toString();

    // Same result both ways (deterministic) ...
    expect(order12).toEqual(order21);
    // ... and lossless: both concurrent characters survive.
    expect(order12).toContain("A");
    expect(order12).toContain("B");
    expect(order12.length).toBe(2);
  });

  it("is idempotent (re-merging the same state is a no-op)", () => {
    const d = new Y.Doc();
    d.getText("t").insert(0, "hello");
    const s = encodeState(d);

    const once = mergeState(emptyState(), s);
    const twice = mergeState(once, s);

    expect(docFromState(twice).getText("t").toString()).toBe("hello");
  });
});

describe("revertContent (true revert)", () => {
  it("restores the editor content to a previous version", () => {
    const doc = new Y.Doc();
    const frag = doc.getXmlFragment("default");
    const text = new Y.XmlText();
    frag.push([text]);
    text.insert(0, "version one");

    const stateA = encodeState(doc); // snapshot of "version one"

    // Move the document on to "version two".
    text.delete(0, text.length);
    text.insert(0, "version two");
    const stateB = encodeState(doc);

    // Revert current (B) back to the content of A.
    const reverted = revertContent(stateB, stateA);
    const out = docFromState(reverted)
      .getXmlFragment("default")
      .toArray()[0]
      .toString();

    expect(out).toBe("version one");
  });
});


//we can more test cases later on if needed
