import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/shell/AppShell";

/**
 * Authenticated app shell.
 *
 * Middleware already redirects unauthenticated visitors before any HTML is
 * produced — that is what prevents a flash of protected content. This second
 * check is defence in depth: if the matcher is ever narrowed or middleware is
 * bypassed, the layout still refuses to render. Cheap, and the failure mode it
 * guards against is leaking the whole console.
 *
 * Reading the session here (a server component) also means no SessionProvider
 * and no client-side session fetch — the user's identity arrives with the HTML.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell user={{ name: session.user.name, email: session.user.email }}>
      {children}
    </AppShell>
  );
}
