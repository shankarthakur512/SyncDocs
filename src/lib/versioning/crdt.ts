import * as Y from "yjs";
import type { Base64 } from "./types";

/**
 * =============================================================================
 * CRDT MERGE CORE  —  the single place that resolves conflicts.
 * =============================================================================
 *
 * Everything about how concurrent/offline edits are merged lives here. The key
 * idea: documents are Yjs CRDTs, and Yjs updates are COMMUTATIVE and IDEMPOTENT.
 * That means:
 *   - Applying updates in ANY order yields the SAME final state (deterministic).
 *   - Re-applying an update you've already seen is a no-op (safe retries).
 *   - Merging never throws away data — concurrent edits are unioned, and Yjs
 *     uses a total order (client-id + logical clock) to break ties identically
 *     on every device.
 *
 * Because of this, "conflict resolution" is not a manual 3-way merge: it is just
 * `merge(a, b)`. The functions below are thin, pure wrappers over Yjs so the
 * rest of the app (server sync, version restore, client engine) shares exactly
 * one merge implementation.
 *
 * These functions are isomorphic (no DOM/Node-only APIs except the base64
 * helpers, which detect their environment), so they run on the server and in
 * the browser identically.
 */

// -----------------------------------------------------------------------------
// Base64 <-> bytes (isomorphic: Node Buffer in API routes, btoa/atob in browser)
// -----------------------------------------------------------------------------

export function toBase64(bytes: Uint8Array): Base64 {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function fromBase64(b64: Base64): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// -----------------------------------------------------------------------------
// State primitives
// -----------------------------------------------------------------------------

/** The encoded state of a brand-new, empty document. Used to initialise a doc. */
export function emptyState(): Uint8Array {
  const doc = new Y.Doc();
  const state = Y.encodeStateAsUpdate(doc);
  doc.destroy();
  return state;
}

/** Full encoded state of a live Y.Doc (e.g. to snapshot the client's doc). */
export function encodeState(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

/** State vector of a live Y.Doc — "what this doc already has". */
export function encodeVector(doc: Y.Doc): Uint8Array {
  return Y.encodeStateVector(doc);
}

/**
 * Applies a remote update to a live Y.Doc. The `origin` tag lets listeners
 * distinguish sync-applied changes from local user edits (preventing echo loops
 * in the client engine).
 */
export function applyToDoc(
  doc: Y.Doc,
  update: Uint8Array,
  origin?: unknown,
): void {
  Y.applyUpdate(doc, update, origin);
}

/**
 * THE MERGE. Combines the current canonical state with an incoming update into
 * a new canonical state. Order-independent and lossless — this single call is
 * how every offline edit reconciles with the server.
 *
 * `Y.mergeUpdates` works directly on encoded updates (no Y.Doc needed), so it is
 * fast and side-effect free.
 */
export function mergeState(
  canonical: Uint8Array,
  incoming: Uint8Array,
): Uint8Array {
  return Y.mergeUpdates([canonical, incoming]);
}

/** State vector of an encoded state — a compact "what I already have" summary. */
export function stateVectorOf(state: Uint8Array): Uint8Array {
  return Y.encodeStateVectorFromUpdate(state);
}

/**
 * Compacts an encoded state to bound growth over time.
 *
 * A long-lived CRDT accumulates "tombstones" (metadata for deleted content) and
 * redundant update structure. Loading the state into a fresh Y.Doc — which has
 * garbage collection enabled by default — drops tombstones that are no longer
 * referenced, and re-encoding produces a single minimal update. Visible content
 * is unchanged; only dead history is removed.
 *
 * Applied server-side when a document's state crosses a size threshold.
 */
export function compactState(state: Uint8Array): Uint8Array {
  const doc = new Y.Doc(); // gc: true by default
  Y.applyUpdate(doc, state);
  const compacted = Y.encodeStateAsUpdate(doc);
  doc.destroy();
  return compacted;
}

/**
 * Computes the minimal delta a client is missing: the part of `canonical` that
 * is NOT covered by the client's state vector. Sending only this keeps sync
 * payloads tiny instead of shipping the whole document each time.
 */
export function diffForClient(
  canonical: Uint8Array,
  clientStateVector: Uint8Array,
): Uint8Array {
  return Y.diffUpdate(canonical, clientStateVector);
}

// -----------------------------------------------------------------------------
// Version reconstruction & restore
// -----------------------------------------------------------------------------

/**
 * Rebuilds a Y.Doc from an encoded state — used to preview a historical version
 * ("time travel") by loading its content into a read-only editor.
 * Caller is responsible for `doc.destroy()` when done.
 */
export function docFromState(state: Uint8Array): Y.Doc {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, state);
  return doc;
}

/**
 * Default Yjs field that TipTap's Collaboration extension binds the editor to
 * (a Y.XmlFragment). Restore rewrites this fragment's content.
 */
export const EDITOR_FIELD = "default";

/**
 * Deep-copies the children of one Yjs XML container into another, rebuilding
 * fresh nodes (Y types cannot be moved between documents). Preserves element
 * tags + attributes (e.g. an image's `src`) and rich-text formatting (via the
 * text delta), so the reconstructed content is identical to the source.
 */
function cloneXmlChildren(
  src: Y.XmlFragment | Y.XmlElement,
  dest: Y.XmlFragment | Y.XmlElement,
): void {
  for (const child of src.toArray()) {
    if (child instanceof Y.XmlText) {
      const text = new Y.XmlText();
      dest.push([text]);
      // toDelta()/applyDelta round-trips text + marks (bold, italic, …).
      text.applyDelta(child.toDelta());
    } else if (child instanceof Y.XmlElement) {
      const el = new Y.XmlElement(child.nodeName);
      dest.push([el]);
      const attrs = child.getAttributes();
      for (const key of Object.keys(attrs)) {
        el.setAttribute(key, attrs[key] as string);
      }
      cloneXmlChildren(child, el); // recurse into the subtree
    }
    // Y.XmlHook (rare, embed-style) is intentionally not copied.
  }
}

/**
 * TRUE REVERT — produces the new canonical state whose CONTENT equals
 * `targetVersion`, expressed as a forward CRDT step from `current`.
 *
 * How it differs from a plain merge: a merge is a union and so cannot "undo"
 * content. Instead we load the current doc, REPLACE the editor fragment's
 * children with a rebuilt copy of the target version's content (inside a single
 * transaction), and re-encode. Because these are ordinary insert/delete ops on
 * the existing document, the result:
 *   - descends from `current` (valid forward step — no corruption), and
 *   - converges identically for every collaborator once they pull it.
 *
 * The caller still snapshots `current` first, so the revert is reversible.
 */
export function revertContent(
  current: Uint8Array,
  targetVersion: Uint8Array,
  fields: string[] = [EDITOR_FIELD],
): Uint8Array {
  const currentDoc = new Y.Doc();
  Y.applyUpdate(currentDoc, current);
  const targetDoc = new Y.Doc();
  Y.applyUpdate(targetDoc, targetVersion);

  currentDoc.transact(() => {
    for (const field of fields) {
      const destFrag = currentDoc.getXmlFragment(field);
      const srcFrag = targetDoc.getXmlFragment(field);
      // Clear current content, then rebuild it from the target version.
      destFrag.delete(0, destFrag.length);
      cloneXmlChildren(srcFrag, destFrag);
    }
  });

  const result = Y.encodeStateAsUpdate(currentDoc);
  currentDoc.destroy();
  targetDoc.destroy();
  return result;
}
