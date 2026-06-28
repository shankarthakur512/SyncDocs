import { AUTHOR } from "@/lib/constants/strings";

/**
 * Application footer.
 *
 * The assignment requires the author's name, GitHub and LinkedIn in the footer.
 * Update the URLs in `src/lib/constants/strings.ts` (AUTHOR).
 */
export default function Footer() {
  return (
    <footer
      className="border-t text-sm text-[var(--muted)]"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 sm:flex-row">
        <span>
          {AUTHOR.builtBy}{" "}
          <span className="font-medium text-[var(--foreground)]">
            {AUTHOR.name}
          </span>
        </span>
        <nav className="flex items-center gap-4" aria-label="Author links">
          <a
            href={AUTHOR.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:text-[var(--accent)] hover:underline focus:text-[var(--accent)]"
          >
            {AUTHOR.githubLabel}
          </a>
          <a
            href={AUTHOR.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:text-[var(--accent)] hover:underline focus:text-[var(--accent)]"
          >
            {AUTHOR.linkedinLabel}
          </a>
        </nav>
      </div>
    </footer>
  );
}
