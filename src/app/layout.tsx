import type { Metadata } from "next";
import "./globals.css";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Local-First Doc Editor",
  description:
    "A local-first, offline-capable collaborative document editor with deterministic conflict resolution and version history.",
};

/**
 * Inline script that applies the saved (or system) theme BEFORE the page paints.
 * This prevents a flash-of-wrong-theme on load. Kept tiny and dependency-free.
 */
const themeBootScript = `
(function () {
  try {
    var t = localStorage.getItem('theme');
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
`;

/**
 * Root layout. Renders the global header (brand + theme toggle) and the
 * persistent footer (required to credit the author) on every page.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <AppHeader />
        <div className="flex-1 flex flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
