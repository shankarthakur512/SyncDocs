import { getCurrentUser } from "@/lib/auth/session";
import DocList from "@/components/DocList";
import SignInPrompt from "@/components/SignInPrompt";

/**
 * Home page.
 *
 * Documents are stored in the database and scoped to the user, so we gate the
 * list behind authentication: signed-out visitors see a sign-in prompt,
 * signed-in users see their document list.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return <SignInPrompt />;
  return <DocList />;
}
