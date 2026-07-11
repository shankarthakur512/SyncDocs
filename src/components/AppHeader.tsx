import Link from "next/link";
import { FileText } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import { APP } from "@/lib/constants/strings";
import { Z_INDEX } from "@/lib/constants/ui";

/**
 * Global top bar shown on every page: brand mark + name, theme toggle, account
 * menu. Document-specific chrome (title, status) lives in DocShell, below this.
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
          className="group flex items-center gap-2 font-semibold tracking-tight"
        >
          {/* Brand mark: gradient tile + doc glyph — recognisable at a glance. */}
          <span
            className="bg-brand flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-sm transition-transform group-hover:scale-105"
            aria-hidden
          >
            <FileText size={15} strokeWidth={2.25} />
          </span>
          <span className="group-hover:text-[var(--accent)] transition-colors">
            {APP.name}
          </span>
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
