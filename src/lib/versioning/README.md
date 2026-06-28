# Versioning & Conflict Resolution — all the logic lives here

This folder is the **single source of truth** for how the app handles offline
edits, merges them when the network returns, and manages document versions /
time-travel. If you want to understand the hard parts of this project, read this
file top to bottom.

## Mental model in one sentence

> A document is a **CRDT** (via Yjs); merging is just `merge(a, b)` and is
> guaranteed to converge to the same result on every device, so we never write a
> manual conflict resolver — we snapshot states and let the CRDT do the merge.

## The files

| File | Responsibility |
| --- | --- |
| `crdt.ts` | **The merge core.** Pure Yjs primitives: merge states, compute deltas, rebuild a version, restore. This is where conflicts are resolved. |
| `types.ts` | Shared wire types (binary CRDT data is base64 over JSON). |
| `validation.ts` | Zod schemas + size caps for sync/version payloads (security). |
| `service.ts` | Server logic: merge incoming edits into canonical state, save/list/get/restore versions — all RBAC-checked. |
| `client.ts` | Browser fetch helpers for the sync + version endpoints. |
| `useVersionedSync.ts` | The client **sync engine**: offline queue, flush on reconnect, push/pull merge, automatic + manual snapshots. |

## Why there are no "merge conflicts" to hand-resolve

A Yjs update is **commutative** and **idempotent**:

- Apply updates in any order → identical final state (**deterministic**).
- Re-apply a seen update → no-op (**safe retries**).
- Concurrent edits are **unioned**; ties are broken by a total order
  (`clientID` + logical clock) the same way on every machine.

So the entire conflict story collapses into one call:
`Y.mergeUpdates([a, b])` (see `mergeState` in `crdt.ts`).

## Flow 1 — Offline edit, then sync on reconnect

```
        OFFLINE                         BACK ONLINE
  ┌──────────────────┐           ┌──────────────────────────┐
  │ user types        │           │ engine flushes the queue  │
  │   ↓               │           │   ↓                       │
  │ Y.Doc updated     │           │ POST /sync { update, sv } │
  │   ↓               │           │   ↓                       │
  │ y-indexeddb saves │           │ server: canonical =       │
  │   ↓               │           │   merge(canonical, update)│  ← THE MERGE
  │ update queued     │  ───────► │   ↓                       │
  │ (outbox)          │           │ reply: diff the client    │
  └──────────────────┘           │   is missing (minimal)    │
                                  │   ↓                       │
                                  │ client applies diff →     │
                                  │ both sides converge       │
                                  └──────────────────────────┘
```

Nothing the user did offline is overwritten: their work arrives as `update` and
is merged in; the server's other changes come back as the reply delta. The union
is lossless and identical on every client.

The server's authoritative copy is one row, `DocumentState.state`
(`Y.encodeStateAsUpdate` of the merged doc). Each client keeps its own copy in
IndexedDB — that is what makes editing work with **zero** network on the hot
path.

## Flow 2 — Save a version (snapshot)

A version is just the **full encoded state** captured at a moment, stored in
`DocumentVersion` with a label/kind/author. Because it's the complete state, any
version's exact content can be rebuilt later (`docFromState`) for preview or
restore.

- **Manual:** the user clicks "Save version".
- **Auto:** the engine snapshots on an interval when there have been changes
  (debounced) so history exists even if the user never clicks.

## Flow 3 — Preview & Restore (time travel) — non-destructive

**Preview** is read-only time-travel: we fetch a version's full state, rebuild a
throwaway `Y.Doc` (`docFromState`), and render it in a read-only editor. The live
document is never touched.

**Restore** is a *true revert* — the live content becomes exactly the chosen
version, but expressed as forward CRDT ops so collaborators converge:

```
restore(versionX):
  1. snapshot CURRENT state → save as an AUTO version        (safety net)
  2. load current doc, REPLACE the editor fragment's content
     with a rebuilt copy of versionX's content (one transaction)
  3. canonical = encode(currentDoc)                          (forward CRDT step)
  4. clients pull the delta on next /sync → everyone converges
```

Why not just `merge(current, versionX)`? A merge is a *union*, so it cannot undo
content (the current state already contains an ancestor version). Rebuilding the
fragment with `revertContent` (`crdt.ts`) actually rolls the content back while
staying a valid forward step. Step 1 makes it **reversible**, so no data is lost.

## Document state size over time (bounding growth)

A long-lived document would otherwise grow unbounded. Three sources, each handled:

1. **CRDT tombstones** — deleted content leaves metadata behind. The server
   **compacts** the canonical state once it crosses `COMPACT_THRESHOLD_BYTES`
   (256 KB): it loads the state into a fresh, garbage-collected `Y.Doc` and
   re-encodes, dropping dead history while keeping visible content identical
   (`compactState` in `crdt.ts`).
2. **Snapshot accumulation** — AUTO versions are pruned to the most recent
   `MAX_AUTO_VERSIONS` (20); MANUAL versions are kept forever
   (`pruneAutoVersions` in `service.ts`).
3. **Inline images** — base64 inflates the CRDT (~33%); images are size-capped
   today, with object-storage offload (embed URL only) as the documented next
   step (`lib/image.ts`).

## Security notes (enforced at the boundary)

- Sync/version payloads are **size-capped** and base64-validated before decoding
  (`validation.ts`) — a malicious client cannot OOM the server with a giant blob.
- Every operation is **RBAC-checked** in `service.ts`: writing/sync and saving/
  restoring versions require `document:write` (so **VIEWERs cannot mutate**);
  reading history requires membership.

## Transport note

Persistence runs over HTTP (`POST /sync` → Postgres), and a standalone
WebSocket relay (`sync-server/`) adds low-latency real-time propagation on top.
The merge logic is transport-agnostic — both feed the same CRDT and converge.
