import DocShell from "@/components/DocShell";

/**
 * Editor route: /doc/[id]
 *
 * In Next.js 16 the `params` object is async and must be awaited. We only need
 * the id here; all stateful/local-first logic lives in the client `DocShell`.
 */
export default async function DocPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocShell docId={id} />;
}
