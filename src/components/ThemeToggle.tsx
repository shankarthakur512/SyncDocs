"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

/**
 * Reads the theme that the inline boot script already applied to <html>, so the
 * button starts in sync with what the user actually sees (no flicker).
 */
function getInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" ? "dark" : "light";
}

/**
 * Light/dark theme switch.
 *
 * Persists the choice to localStorage and applies it by setting `data-theme` on
 * <html>; all colors come from CSS variables keyed off that attribute, so the
 * whole UI updates instantly with one DOM write.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Sync state with the already-applied theme after hydration.
  useEffect(() => {
    setTheme(getInitialTheme());
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures (e.g. private mode); theme still applies for the session.
    }
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      aria-pressed={isDark}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-base transition-colors hover:bg-[rgba(127,127,127,0.12)]"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Render a neutral icon until mounted to avoid SSR/client mismatch. */}
      <span aria-hidden="true">{mounted ? (isDark ? "☀️" : "🌙") : "🌓"}</span>
    </button>
  );
}
