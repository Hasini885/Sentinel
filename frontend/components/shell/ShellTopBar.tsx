"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { navItemFor } from "@/components/shell/nav";
import type { ShellUser } from "@/components/shell/AppShell";
import { UserMenu } from "@/components/shell/UserMenu";
import { duration } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";

/**
 * Shell top bar: shows where you are, plus global controls.
 *
 * The heading is keyed on the route so it cross-fades when you navigate —
 * a small thing, but it stops the header from being the one static element
 * while everything below it animates.
 *
 * Page-specific content (the dashboard's KPI strip, for instance) is rendered
 * by the page itself, not here — the shell stays route-agnostic.
 */
export function ShellTopBar({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const item = navItemFor(pathname);
  const { reduced, systemReduced, toggle } = useMotionPreference();

  return (
    <header className="relative z-10 flex shrink-0 items-center justify-between gap-6 border-b border-edge bg-panel/60 px-6 py-3.5 backdrop-blur-sm">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={item.href}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: duration.fast }}
          className="min-w-0"
        >
          <h1 className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-ink">
            {item.title}
          </h1>
          <p className="truncate text-meta text-muted">{item.subtitle}</p>
        </motion.div>
      </AnimatePresence>

      <div className="flex shrink-0 items-center gap-2">
      <motion.button
        onClick={toggle}
        disabled={systemReduced}
        whileHover={systemReduced ? undefined : { y: -1 }}
        whileTap={systemReduced ? undefined : { scale: 0.96 }}
        title={
          systemReduced
            ? "Your system is set to reduce motion — Sentinel is honouring it"
            : reduced
              ? "Animations reduced. Click to restore full motion."
              : "Full motion. Click to reduce animation."
        }
        aria-pressed={reduced}
        className="flex shrink-0 items-center gap-2 rounded-md border border-edge bg-raised/60 px-3 py-1.5 text-meta font-medium text-muted transition-colors duration-fast hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${reduced ? "bg-muted" : "bg-accent breathe"}`}
          aria-hidden
        />
        {reduced ? "Motion reduced" : "Motion on"}
      </motion.button>

        <UserMenu name={user.name} email={user.email} />
      </div>
    </header>
  );
}
