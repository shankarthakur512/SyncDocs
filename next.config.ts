import type { NextConfig } from "next";

/**
 * Next.js configuration.
 *
 * `transpilePackages` is set for the Yjs/TipTap ecosystem because some of these
 * packages ship modern ESM that benefits from being transpiled by Next's
 * compiler, avoiding occasional interop issues during SSR/build.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "yjs",
    "y-indexeddb",
    "y-prosemirror",
    "@tiptap/react",
    "@tiptap/pm",
  ],
};

export default nextConfig;
