import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { ACTIONS, APP } from "@/lib/constants/strings";

/** Multi-colour Google "G" logo. */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/**
 * Sign-in page — colourful, themed card with a Google sign-in (Auth.js action).
 * Redirects home if the user is already authenticated.
 */
export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16">
      {/* Decorative background blobs. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* Single quiet indigo tint — the redesign avoids multicolour effects. */}
        <div
          className="animate-blob absolute -top-20 -left-10 h-72 w-72 rounded-full blur-3xl"
          style={{ background: "color-mix(in srgb, var(--accent) 22%, transparent)" }}
        />
      </div>

      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border shadow-xl"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        {/* Gradient banner. */}
        <div className="bg-brand px-8 py-7 text-center text-white">
          <h1 className="text-xl font-bold tracking-tight">{APP.name}</h1>
          <p className="mt-1 text-sm text-white/85">Welcome back</p>
        </div>

        <div className="px-8 py-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            Sign in to access your documents and collaborate in real time.
          </p>

          {/* Auth.js server action: starts the Google OAuth flow, returns home. */}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
            className="mt-6"
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-[rgba(127,127,127,0.08)]"
              style={{ borderColor: "var(--border)" }}
            >
              <GoogleLogo />
              {ACTIONS.continueWithGoogle}
            </button>
          </form>

          <p className="mt-5 text-xs text-[var(--muted)]">
            By continuing you agree to use this demo responsibly.
          </p>
        </div>
      </div>
    </main>
  );
}
