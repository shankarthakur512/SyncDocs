"use client";

import type { DocumentDetail, DocumentSummary } from "@/lib/api/client";

/**
 * Local cache of document metadata (titles, roles, collaborator lists, and the
 * document list) in localStorage.
 *
 * WHY: the document *content* is already offline-first (Yjs + IndexedDB), but
 * the surrounding metadata came from the network. Caching it means that when the
 * user is offline — including a full page refresh — we can render the editor and
 * its chrome from the last known state instead of failing. This is what keeps
 * "open/edit/close with zero network blocking the UI" true while offline.
 *
 * All reads/writes are defensive: storage may be unavailable (private mode) or
 * hold stale/corrupt JSON, and must never throw into the render path.
 */

const detailKey = (id: string) => `doc-detail:${id}`;
const LIST_KEY = "doc-list";


/**
 * cacheDocDetail caches the document detail in localStorage.
 * @param {DocumentDetail} detail - The document detail to cache.
 * @returns {void}
 */
export function cacheDocDetail(detail: DocumentDetail): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(detailKey(detail.id), JSON.stringify(detail));
  } catch {
    /* ignore quota/private-mode failures */
  }
}
/**
 * readDocDetail reads the cached document detail from localStorage, or null if
 * unavailable.
 * @param {string} id - The document ID to read.
 * @returns {DocumentDetail | null}
 */
export function readDocDetail(id: string): DocumentDetail | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(detailKey(id));
    return raw ? (JSON.parse(raw) as DocumentDetail) : null;
  } catch {
    return null;
  }
}

/**
 * cacheDocList caches the list of documents the user can access in localStorage.
 * @param {DocumentSummary[]} docs - The list of document summaries to cache.
 * @returns {void}
 */
export function cacheDocList(docs: DocumentSummary[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LIST_KEY, JSON.stringify(docs));
  } catch {
    /* ignore */
  }
}

/**
 * readDocList reads the cached document list from localStorage, or null if
 * unavailable. 
 * @param {void}
 * @returns {DocumentSummary[] | null}
 */
export function readDocList(): DocumentSummary[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LIST_KEY);
    return raw ? (JSON.parse(raw) as DocumentSummary[]) : null;
  } catch {
    return null;
  }
}
