"use client";

import { Sidebar } from "@/components/shell/Sidebar";
import { ShellTopBar } from "@/components/shell/ShellTopBar";

/**
 * The persistent frame: sidebar on the left, top bar above the route content.
 *
 * Neither the shell nor its children set an opaque background, so the ambient
 * canvas backdrop rendered by a route stays visible behind everything.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ShellTopBar />
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
