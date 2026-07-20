"use client";

import { Sidebar } from "@/components/shell/Sidebar";
import { ShellTopBar } from "@/components/shell/ShellTopBar";

export type ShellUser = { name?: string | null; email?: string | null };

/**
 * The persistent frame: sidebar on the left, top bar above the route content.
 *
 * Neither the shell nor its children set an opaque background, so the ambient
 * canvas backdrop rendered by a route stays visible behind everything.
 */
export function AppShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ShellTopBar user={user} />
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
