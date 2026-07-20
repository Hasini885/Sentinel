"use client";

import { motion } from "framer-motion";

import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { rise, staggerTight } from "@/components/ui/motion";
import { SkeletonStat } from "@/components/ui/Skeleton";
import type { Summary } from "@/lib/api";

/**
 * The dashboard's KPI row. Lives in the page rather than the shell top bar,
 * because these numbers belong to the Overview route — the shell stays
 * route-agnostic.
 */

function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "warn";
}) {
  return (
    <motion.div
      variants={rise}
      className="flex min-w-0 flex-col gap-0.5 border-l border-edge pl-5 first:border-l-0 first:pl-0"
    >
      <span className="flex items-center gap-1.5 text-micro uppercase text-muted">
        <span className="h-2.5 w-px bg-accent/60" aria-hidden />
        {label}
      </span>
      <span
        className={`font-display text-stat font-semibold tabular-nums ${
          tone === "warn" ? "text-risk-high" : "text-ink"
        }`}
      >
        {value}
      </span>
      {hint && <span className="truncate text-micro tabular-nums text-muted/70">{hint}</span>}
    </motion.div>
  );
}

export function StatStrip({
  summary,
  live,
  lastUpdated,
  onOpenPolicies,
}: {
  summary: Summary | null;
  live: boolean;
  lastUpdated: Date | null;
  onOpenPolicies: () => void;
}) {
  return (
    <motion.div
      variants={staggerTight}
      initial="hidden"
      animate="show"
      className="flex flex-wrap items-end justify-between gap-6 rounded-xl border border-edge bg-panel/80 px-5 py-4 shadow-panel backdrop-blur-sm"
    >
      <div className="flex items-end gap-5">
        {summary ? (
          <>
            <Stat label="Actions today" value={<AnimatedNumber value={summary.total_actions_today} />} />
            <Stat
              label="Blocked"
              value={
                <AnimatedNumber
                  value={summary.blocked_pct_today}
                  format={(n) => `${n.toFixed(1)}%`}
                />
              }
              hint={`${summary.blocked_today} actions`}
              tone={summary.blocked_pct_today > 0 ? "warn" : "default"}
            />
            <Stat
              label="Est. cost today"
              value={
                <AnimatedNumber
                  value={summary.total_cost_usd_today}
                  format={(n) => `$${n.toFixed(4)}`}
                />
              }
              hint={`$${summary.total_cost_usd_all_time.toFixed(4)} all time`}
            />
          </>
        ) : (
          <>
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2" aria-hidden>
              {live && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  live ? "bg-accent" : "bg-risk-high"
                }`}
              />
            </span>
            <span className="text-micro uppercase text-muted">{live ? "Live" : "Stale"}</span>
          </div>
          {lastUpdated && (
            <span className="text-micro tabular-nums text-muted/70">
              {lastUpdated.toLocaleTimeString([], { hour12: false })}
            </span>
          )}
        </div>
        <motion.button
          onClick={onOpenPolicies}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.96 }}
          className="rounded-md border border-edge bg-raised/60 px-3.5 py-1.5 text-meta font-medium text-muted transition-colors duration-fast hover:border-accent/50 hover:text-accent hover:shadow-glow"
        >
          Policies
        </motion.button>
      </div>
    </motion.div>
  );
}
