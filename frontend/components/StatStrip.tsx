"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

import { StatTile } from "@/components/charts/StatTile";
import {
  blockedPctSeries,
  bucketActions,
  costSeries,
  countSeries,
  halfOverHalfDelta,
} from "@/components/charts/trends";
import { SkeletonStat } from "@/components/ui/Skeleton";
import { staggerTight } from "@/components/ui/motion";
import type { AgentAction, Summary } from "@/lib/api";

/**
 * The dashboard's KPI row.
 *
 * The headline numbers come from /api/summary (authoritative, all actions). The
 * sparklines and deltas are derived from the loaded action window, because no
 * time-series endpoint exists and this phase does not add one — so they describe
 * recent activity, not all time. The caption says so; do not restate them as
 * lifetime trends.
 */
export function StatStrip({
  summary,
  actions,
  live,
  lastUpdated,
  demoMode,
  onToggleDemo,
  onOpenPolicies,
}: {
  summary: Summary | null;
  /** Loaded feed window — the only time-ordered data available on the client. */
  actions: AgentAction[];
  live: boolean;
  lastUpdated: Date | null;
  demoMode: boolean;
  onToggleDemo: () => void;
  onOpenPolicies: () => void;
}) {
  const trends = useMemo(() => {
    const buckets = bucketActions(actions);
    const counts = countSeries(buckets);
    const blocked = blockedPctSeries(buckets);
    const cost = costSeries(buckets);
    return {
      counts,
      blocked,
      cost,
      countDelta: halfOverHalfDelta(counts),
      blockedDelta: halfOverHalfDelta(blocked),
      costDelta: halfOverHalfDelta(cost),
    };
  }, [actions]);

  return (
    <motion.div
      variants={staggerTight}
      initial="hidden"
      animate="show"
      className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4 rounded-xl border border-edge bg-panel/80 px-5 py-4 shadow-panel backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        {summary ? (
          <>
            <StatTile
              label="Actions today"
              value={summary.total_actions_today}
              format={(n) => Math.round(n).toLocaleString()}
              series={trends.counts}
              delta={trends.countDelta}
              polarity="neutral"
            />
            <StatTile
              label="Blocked"
              value={summary.blocked_pct_today}
              format={(n) => `${n.toFixed(1)}%`}
              hint={`${summary.blocked_today} actions`}
              series={trends.blocked}
              delta={trends.blockedDelta}
              polarity="up-bad"
            />
            <StatTile
              label="Est. cost today"
              value={summary.total_cost_usd_today}
              format={(n) => `$${n.toFixed(4)}`}
              hint={`$${summary.total_cost_usd_all_time.toFixed(4)} all time`}
              series={trends.cost}
              delta={trends.costDelta}
              polarity="up-bad"
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
        <div className="flex flex-col items-end gap-0.5">
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
          {trends.counts.length > 0 && (
            <span className="text-micro text-muted/60">trend: recent window</span>
          )}
        </div>
        <motion.button
          onClick={onToggleDemo}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.96 }}
          aria-pressed={demoMode}
          className={`rounded-md border px-3.5 py-1.5 text-meta font-medium transition-colors duration-fast ${
            demoMode
              ? "border-accent/60 bg-accent/15 text-accent shadow-glow"
              : "border-edge bg-raised/60 text-muted hover:border-accent/50 hover:text-accent"
          }`}
        >
          {demoMode ? "Stop demo" : "Demo mode"}
        </motion.button>
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
