import Link from "next/link";
import { ACTIONS, APP, HOME_FEATURES } from "@/lib/constants/strings";

/**
 * Landing hero shown to signed-out visitors.
 *
 * gradient "blobs" sit behind the content and are theme-independent.
 */
export default function SignInPrompt() {
  return (
    <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-20">
      {/* Decorative background blobs. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="animate-blob absolute -top-24 left-1/4 h-72 w-72 rounded-full blur-3xl"
          style={{ background: "rgba(37, 99, 235, 0.30)" }}
        />
        <div
          className="animate-blob absolute top-10 right-1/4 h-72 w-72 rounded-full blur-3xl"
          style={{ background: "rgba(124, 58, 237, 0.28)", animationDelay: "3s" }}
        />
        <div
          className="animate-blob absolute bottom-0 left-1/3 h-72 w-72 rounded-full blur-3xl"
          style={{ background: "rgba(236, 72, 153, 0.22)", animationDelay: "6s" }}
        />
      </div>

      <div className="mx-auto w-full max-w-3xl text-center">
        <span
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
          style={{
            borderColor: "var(--border)",
            background: "color-mix(in srgb, var(--surface) 70%, transparent)",
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "#10b981" }}
          />
          Local-first · CRDT-powered
        </span>

        <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
          <span className="text-gradient">{APP.name}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-[var(--muted)]">
          {APP.tagline}
        </p>

        <Link
          href="/signin"
          className="mt-7 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5"
          style={{
            backgroundImage:
              "linear-gradient(120deg, #2563eb, #7c3aed 60%, #ec4899)",
          }}
        >
          {ACTIONS.signInToContinue}
          <span aria-hidden>→</span>
        </Link>

        {/* Feature cards. */}
        <div className="mt-14 grid gap-4 text-left sm:grid-cols-2">
          {HOME_FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md"
              style={{
                borderColor: "var(--border)",
                background:
                  "color-mix(in srgb, var(--surface) 88%, transparent)",
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-lg"
                  style={{ background: "rgba(37, 99, 235, 0.12)" }}
                  aria-hidden
                >
                  {f.icon}
                </span>
                <h2 className="font-semibold">{f.title}</h2>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
