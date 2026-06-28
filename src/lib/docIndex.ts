"use client";

/**
 * A tiny client-side index of documents the user has created on this device.
 *
 * The document *content* lives in IndexedDB (via Yjs); this index just stores
 * lightweight metadata (id + title + timestamps) in localStorage so the home
 * page can list documents without opening every Yjs store. In Phase 2 this list
 * will be reconciled with the server's document list for the signed-in user.
 */

export interface DocMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "docs:index";

/** Reads the document index, tolerating missing/corrupt storage. */
export function listDocs(): DocMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as DocMeta[]) : [];
    // Newest first.
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

/** Persists the full index. */
function saveAll(docs: DocMeta[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

/** Creates a new document entry and returns it. */
export function createDoc(title: string): DocMeta {
  const now = Date.now();
  const meta: DocMeta = {
    // crypto.randomUUID is available in all modern browsers.
    id: crypto.randomUUID(),
    title: title.trim() || "Untitled document",
    createdAt: now,
    updatedAt: now,
  };
  saveAll([meta, ...listDocs()]);
  return meta;
}

/** Looks up a single document's metadata. */
export function getDoc(id: string): DocMeta | undefined {
  return listDocs().find((d) => d.id === id);
}
