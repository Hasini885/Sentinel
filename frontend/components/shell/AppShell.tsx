"use client";

import dynamic from "next/dynamic";

import { useSentinelData } from "@/components/data/SentinelDataProvider";
import { DemoBanner } from "@/components/shell/DemoBanner";
import { Sidebar } from "@/components/shell/Sidebar";
import { ShellTopBar } from "@/components/shell/ShellTopBar";

// The particle canvas is the heaviest thing on screen and contributes nothing
// to first paint, so it loads after hydration. ssr:false because it touches
// window/canvas on mount and would only be discarded during hydration anyway.
const ParticleField = dynamic(
  () => import("@/components/ParticleField").then((m) => m.ParticleField),
  { ssr: false },
);

export type ShellUser = { name?: string | null; email?: string | null };

/**
 * The persistent frame: sidebar, top bar, and the ambient backdrop.
 *
 * The backdrop lives here rather than on a page so it persists across
 * navigation — a canvas that restarted on every route change would flicker,
 * and its whole job is to feel continuous.
 *
 * Nothing here sets an opaque background, so the canvas stays visible behind
 * the route content.
 */
export function AppShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const { pulse, tint } = useSentinelData();

  return (
    <div className="relative flex h-screen overflow-hidden">
      <ParticleField pulse={pulse} tint={tint} />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ShellTopBar user={user} />
        <DemoBanner />
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
