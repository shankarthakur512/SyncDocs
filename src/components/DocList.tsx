"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, FileText, Plus } from "lucide-react";
import {
  ApiError,
  createDocument,
  listDocuments,
  type DocumentSummary,
} from "@/lib/api/client";
import { cacheDocList, readDocList } from "@/lib/cache/docCache";
import { ACTIONS, FORMAT, LABELS, MESSAGES } from "@/lib/constants/strings";
import RoleBadge from "./RoleBadge";

/** Ownership filter tabs (spec 1b): All · Owned by me · Shared with me. */
type Filter = "all" | "owned" | "shared";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: LABELS.filterAll },
  { key: "owned", label: LABELS.filterOwned },
  { key: "shared", label: LABELS.filterShared },
];

/**
 * Documents dashboard — per the redesign spec:
 * serif page heading with a count subtitle, an indigo "New document" action,
 * ownership filter tabs, and a quiet table-style row list (not cards).
 *
 * Data flow unchanged: list on mount with offline cache fallback; creating a
 * document makes the caller OWNER and navigates straight into the editor.
 */
export default function DocList() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the user's documents once on mount, with offline fallback to cache.
  useEffect(() => {
    let active = true;
    listDocuments()
      .then((res) => {
        if (!active) return;
        setDocs(res.documents);
        cacheDocList(res.documents); // keep for offline use
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const cached = readDocList();
        if (cached) {
          setDocs(cached);
          setError(null);
        } else {
          setError(
            err instanceof ApiError
              ? err.message
              : MESSAGES.loadDocumentsFailed,
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  /** Creates a blank document and opens it. */
  const create = async () => {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const { document } = await createDocument();
      router.push(`/doc/${document.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : MESSAGES.createDocumentFailed,
      );
      setCreating(false);
    }
  };

  // The list is already server-sorted by last edited; tabs only filter.
  const visible = useMemo(() => {
    if (filter === "owned") return docs.filter((d) => d.role === "OWNER");
    if (filter === "shared") return docs.filter((d) => d.role !== "OWNER");
    return docs;
  }, [docs, filter]);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10">
      {/* Heading row: serif title + count, primary action right. */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {LABELS.homeHeading}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {docs.length} {docs.length === 1 ? "document" : "documents"} ·{" "}
            {LABELS.homeSubtitle}
          </p>
        </div>
        <button
          type="button"
          disabled={creating}
          onClick={() => void create()}
          className="bg-brand inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Plus size={15} strokeWidth={2.25} aria-hidden />
          {creating ? ACTIONS.creating : LABELS.newDocument}
        </button>
      </div>

      {/* Filter tabs + sort note. */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Filter documents"
          className="flex items-center gap-1"
        >
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={[
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.key
                  ? "text-white"
                  : "text-[var(--muted)] hover:bg-[rgba(127,127,127,0.10)]",
              ].join(" ")}
              style={filter === f.key ? { background: "var(--accent)" } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs" style={{ color: "var(--faint)" }}>
          {LABELS.sortNote}
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {/* Row list (table-style, spec 1b). */}
      <div className="card mt-4 overflow-hidden">
        {loading ? (
          <ul aria-busy="true" className="divide-y" style={{ borderColor: "var(--border)" }}>
            {[...Array(4)].map((_, i) => (
              <li key={i} className="flex animate-pulse items-center gap-3 px-4 py-4">
                <div className="h-8 w-8 rounded-lg bg-[rgba(127,127,127,0.15)]" />
                <div className="flex-1">
                  <div className="h-4 w-1/3 rounded bg-[rgba(127,127,127,0.15)]" />
                  <div className="mt-2 h-3 w-1/5 rounded bg-[rgba(127,127,127,0.12)]" />
                </div>
              </li>
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)]">
            {MESSAGES.noDocuments}
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {visible.map((doc) => (
              <li key={doc.id}>
                <Link
                  href={`/doc/${doc.id}`}
                  className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--accent-soft)]"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--accent)]"
                    style={{ background: "var(--accent-soft)" }}
                    aria-hidden
                  >
                    <FileText size={15} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {doc.title}
                    </span>
                    <span className="mt-0.5 block text-xs" style={{ color: "var(--faint)" }}>
                      {FORMAT.updatedAt(doc.updatedAt)}
                    </span>
                  </span>
                  <RoleBadge role={doc.role} />
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
