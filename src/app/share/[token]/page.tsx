import GuestDocShell from "@/components/GuestDocShell";

/**
 * Guest route: /share/[token] — PUBLIC.
 *
 * Anyone with a valid share link can view (never edit) the document without
 * signing in. All logic lives in the client `GuestDocShell`; this server
 * component only unwraps the async route param (Next.js 16).
 */
export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <GuestDocShell shareToken={token} />;
}
