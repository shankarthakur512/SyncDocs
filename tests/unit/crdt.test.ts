import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import {
  toBase64,
  fromBase64,
  emptyState,
  encodeState,
  mergeState,
  revertContent,
  compactState,
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

describe("conflict resolution: offline edit arriving AFTER a later online edit", () => {
  /**
   * The interview scenario:
   *   1. Both clients start from the same base document.
   *   2. Client A edits OFFLINE (earlier in wall-clock time).
   *   3. Client B edits ONLINE (later), and B's update reaches the server FIRST.
   *   4. A reconnects; A's older update arrives LAST.
   *
   * Expected behaviour: arrival order and wall-clock time are irrelevant.
   * Yjs orders concurrent ops by (clientID, logical clock), so the server and
   * every client converge on the SAME document containing BOTH edits.
   */
  it("preserves both edits and converges regardless of arrival order", () => {
    // 1) Shared base document.
    const base = new Y.Doc();
    base.getText("t").insert(0, "Hello");
    const baseState = encodeState(base);

    // 2) Two clients hydrate from the same base…
    const clientA = docFromState(baseState); // goes offline
    const clientB = docFromState(baseState); // stays online

    // …and edit the SAME position concurrently (worst case).
    clientA.getText("t").insert(5, " from offline-A"); // earlier edit
    clientB.getText("t").insert(5, " from online-B"); // later edit

    const updateA = encodeState(clientA);
    const updateB = encodeState(clientB);

    // 3) Server receives B FIRST, then A (offline data arrives late)…
    const serverBFirst = mergeState(mergeState(baseState, updateB), updateA);
    // …and the counterfactual: A first, then B.
    const serverAFirst = mergeState(mergeState(baseState, updateA), updateB);

    const textBFirst = docFromState(serverBFirst).getText("t").toString();
    const textAFirst = docFromState(serverAFirst).getText("t").toString();

    // Deterministic: byte-order of arrival does not change the result.
    expect(textBFirst).toEqual(textAFirst);
    // Lossless: NEITHER edit was overwritten by the other.
    expect(textBFirst).toContain("from offline-A");
    expect(textBFirst).toContain("from online-B");
  });

  it("every client converges to the server's result after pulling", () => {
    const base = new Y.Doc();
    base.getText("t").insert(0, "Doc");
    const baseState = encodeState(base);

    const clientA = docFromState(baseState);
    const clientB = docFromState(baseState);
    clientA.getText("t").insert(3, " [A-offline]");
    clientB.getText("t").insert(3, " [B-online]");

    // Server merged in "wrong" (reverse-chronological) order.
    const server = mergeState(
      mergeState(baseState, encodeState(clientB)),
      encodeState(clientA),
    );

    // Each client pulls the canonical state (idempotent re-apply of own ops).
    const finalA = docFromState(mergeState(encodeState(clientA), server));
    const finalB = docFromState(mergeState(encodeState(clientB), server));

    expect(finalA.getText("t").toString()).toEqual(
      finalB.getText("t").toString(),
    );
    expect(finalA.getText("t").toString()).toEqual(
      docFromState(server).getText("t").toString(),
    );
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

describe("compactState (state-size handling)", () => {
  it("preserves content while not growing the state", () => {
    // Build up history: insert a lot of text, then delete most of it. The raw
    // state carries tombstones for the deleted content.
    const doc = new Y.Doc();
    const t = doc.getText("t");
    t.insert(0, "x".repeat(500));
    t.delete(0, 480); // leaves "x".repeat(20), plus deletion tombstones
    const raw = encodeState(doc);

    const compacted = compactState(raw);

    // Content is identical after compaction ...
    expect(docFromState(compacted).getText("t").toString()).toBe(
      docFromState(raw).getText("t").toString(),
    );
    // ... and the compacted state is no larger than the raw one.
    expect(compacted.byteLength).toBeLessThanOrEqual(raw.byteLength);
  });
});

//we can more test cases later on if needed
