import Link from "next/link";
import { GitMerge, History, Users, Zap, type LucideIcon } from "lucide-react";
import { APP, HOME_FEATURES } from "@/lib/constants/strings";

/**
 * Icon per feature card (ordered to match HOME_FEATURES). Kept here rather
 * than in the strings catalogue so copy stays pure data and rendering stays
 * in the component layer.
 */
const FEATURE_ICONS: readonly LucideIcon[] = [Zap, GitMerge, History, Users];

/**
 * Landing hero shown to signed-out visitors — per the redesign spec:
 * clean light surface, serif display headline, indigo primary CTA + quiet
 * secondary, then a four-column feature strip. No decorative gradients.
 */
export default function SignInPrompt() {
  return (
    <section className="flex flex-1 flex-col items-center px-4 pt-20 pb-16">
      <div className="mx-auto w-full max-w-3xl text-center">
        {/* Eyebrow badge. */}
        <span className="chip text-[var(--muted)]">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--success)" }}
          />
          {APP.heroBadge}
        </span>

        {/* Display headline: Source Serif, solid ink (spec 1a). */}
        <h1 className="font-display mx-auto mt-6 max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          {APP.heroTitle}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-[var(--muted)]">
          {APP.tagline}
        </p>

        {/* CTAs: solid indigo primary + outline secondary. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signin"
            className="bg-brand rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            {APP.ctaPrimary}
          </Link>
          <a
            href="#features"
            className="rounded-lg border px-6 py-3 text-sm font-semibold transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            style={{ borderColor: "var(--border)" }}
          >
            {APP.ctaSecondary}
          </a>
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--faint)" }}>
          {APP.ctaNote}
        </p>

        {/* Feature strip: four quiet columns with small accent icons. */}
        <div
          id="features"
          className="mt-16 grid gap-8 border-t pt-10 text-left sm:grid-cols-2 lg:grid-cols-4"
          style={{ borderColor: "var(--border)" }}
        >
          {HOME_FEATURES.map((f, i) => {
            const Icon = FEATURE_ICONS[i] ?? Zap;
            return (
              <div key={f.title}>
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--accent)]"
                  style={{ background: "var(--accent-soft)" }}
                  aria-hidden
                >
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <h2 className="mt-3 text-sm font-semibold">{f.title}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
