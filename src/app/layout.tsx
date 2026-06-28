import type { Metadata } from "next";
import "./globals.css";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "SyncDocs",
  description:
    "A local-first, offline-capable collaborative document editor",
};


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
        <ServiceWorkerRegister />
        <AppHeader />
        <div className="flex-1 flex flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
