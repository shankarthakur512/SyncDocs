import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import { APP } from "@/lib/constants/strings";
import { Z_INDEX } from "@/lib/constants/ui";

/**
 * Global top bar shown on every page: brand link, theme toggle, account menu.
 * Document-specific chrome (title, status) lives in DocShell, below this bar.
 */
export default function AppHeader() {
  return (
    <header
      className="sticky top-0 border-b backdrop-blur"
      style={{
        zIndex: Z_INDEX.appHeader,
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--background) 80%, transparent)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="font-semibold tracking-tight hover:text-[var(--accent)]"
        >
          {APP.name}
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* Async server component: reads the session for the account control. */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
