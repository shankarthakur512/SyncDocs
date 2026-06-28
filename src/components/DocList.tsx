"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ApiError,
  createDocument,
  listDocuments,
  type DocumentSummary,
} from "@/lib/api/client";
import { cacheDocList, readDocList } from "@/lib/cache/docCache";
import { ACTIONS, FORMAT, LABELS, MESSAGES } from "@/lib/constants/strings";
import RoleBadge from "./RoleBadge";

/**
 * Home-screen document list, backed by the database via the documents API.
 *
 * Fetches the signed-in user's documents on mount and lets them create a new
 * one (which makes them OWNER) and jump straight into the editor.
 */
export default function DocList() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [title, setTitle] = useState("");
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
        // Offline / failure: show the last known list instead of an error.
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const { document } = await createDocument(title.trim() || undefined);
      router.push(`/doc/${document.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : MESSAGES.createDocumentFailed,
      );
      setCreating(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      {/* Hero card: title + create form on a subtle brand gradient. */}
      <div
        className="rounded-2xl border p-6 shadow-sm sm:p-8"
        style={{
          borderColor: "var(--border)",
          backgroundImage:
            "linear-gradient(135deg, rgba(37,99,235,0.10), rgba(124,58,237,0.07) 55%, rgba(236,72,153,0.06))",
        }}
      >
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          <span className="text-gradient">{LABELS.yourDocuments}</span>
        </h1>
        <p className="mt-1 max-w-md text-sm text-[var(--muted)]">
          {MESSAGES.docsHelp}
        </p>

        <form onSubmit={handleCreate} className="mt-6 flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={LABELS.newDocumentTitle}
            aria-label={LABELS.newDocumentTitle}
            maxLength={200}
            className="flex-1 rounded-lg border px-3.5 py-2.5 text-sm shadow-sm outline-none transition-colors focus:border-[var(--accent)]"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            style={{
              backgroundImage:
                "linear-gradient(120deg, #2563eb, #7c3aed 70%, #ec4899)",
            }}
          >
            {creating ? ACTIONS.creating : ACTIONS.create}
          </button>
        </form>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-[var(--muted)]">{MESSAGES.loading}</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{MESSAGES.noDocuments}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {docs.map((doc) => (
              <li key={doc.id}>
                <Link
                  href={`/doc/${doc.id}`}
                  className="group block rounded-xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-md"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm"
                        style={{ background: "rgba(37, 99, 235, 0.12)" }}
                        aria-hidden
                      >
                        📄
                      </span>
                      <span className="truncate font-medium">{doc.title}</span>
                    </span>
                    <RoleBadge role={doc.role} />
                  </span>
                  <span className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
                    {FORMAT.updatedAt(doc.updatedAt)}
                    <span className="text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100">
                      Open →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
