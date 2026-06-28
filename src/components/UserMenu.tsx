import Link from "next/link";
import { auth, signOut } from "@/auth";
import { ACTIONS } from "@/lib/constants/strings";

/**
 * Header account control (server component).
 *
 * Shows a "Sign in" link when logged out, or the user's name + a sign-out
 * button (Auth.js server action) when logged in.
 */
export default async function UserMenu() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return (
      <Link
        href="/signin"
        className="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[rgba(127,127,127,0.12)]"
        style={{ borderColor: "var(--border)" }}
      >
        {ACTIONS.signIn}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span
        className="hidden max-w-[12rem] truncate text-sm text-[var(--muted)] sm:block"
        title={user.email ?? undefined}
      >
        {user.name ?? user.email}
      </span>
      {/* Server action keeps the sign-out CSRF-safe and cookie-clearing on the server. */}
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[rgba(127,127,127,0.12)]"
          style={{ borderColor: "var(--border)" }}
        >
          {ACTIONS.signOut}
        </button>
      </form>
    </div>
  );
}
