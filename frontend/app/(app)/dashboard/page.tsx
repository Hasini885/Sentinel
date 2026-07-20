"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import { RiskDistribution } from "@/components/charts/RiskDistribution";
import { StatTile } from "@/components/charts/StatTile";
import {
  blockedPctSeries,
  bucketActions,
  costSeries,
  countSeries,
  halfOverHalfDelta,
} from "@/components/charts/trends";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { RecentActions } from "@/components/dashboard/RecentActions";
import { useSentinelData } from "@/components/data/SentinelDataProvider";
import { ErrorState } from "@/components/ui/States";
import { SkeletonStat } from "@/components/ui/Skeleton";
import { rise, stagger, staggerTight } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";
import { API_BASE } from "@/lib/api";

/**
 * Overview: the state of the system in one screen.
 *
 * Everything here is a highlight that hands off somewhere else — the page
 * answers "is anything wrong, and is spend sane", then routes you to the page
 * that can act on the answer. It owns no fetching of its own; all data comes
 * from the shared provider in the layout.
 */
export default function DashboardPage() {
  const {
    actions,
    pending,
    summary,
    riskCounts,
    loading,
    unreachable,
    activeFeature,
    demoMode,
    setDemoMode,
    refresh,
    lastUpdated,
    streamStatus,
  } = useSentinelData();
  const { reduced } = useMotionPreference();

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

  if (unreachable) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-xl border border-edge bg-panel/80">
          <ErrorState
            title="Can't reach the Sentinel API"
            body={
              <>
                Nothing has loaded from <code className="text-ink">{API_BASE}</code>. Start
                the backend with{" "}
                <code className="text-ink">python -m uvicorn app.main:app --port 8000</code>
                , or explore the interface with demo mode.
              </>
            }
            onRetry={refresh}
          />
          <div className="border-t border-edge px-6 pb-6 pt-4 text-center">
            <button
              onClick={() => setDemoMode(true)}
              className="rounded-md border border-accent/50 bg-accent/15 px-4 py-2 font-sans text-sm font-medium text-accent transition-colors duration-fast hover:bg-accent/25"
            >
              Start demo mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-7xl flex-col gap-4 p-4 sm:p-6"
      >
        <motion.section
          variants={rise}
          className="rounded-xl border border-edge bg-panel/80 px-5 py-4 shadow-panel backdrop-blur-sm"
        >
          <motion.div
            variants={staggerTight}
            initial="hidden"
            animate="show"
            className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4"
          >
            <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
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
                    {streamStatus === "connected" && !reduced && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
                    )}
                    <span
                      className={`relative inline-flex h-2 w-2 rounded-full ${
                        streamStatus === "connected" ? "bg-accent" : "bg-risk-medium"
                      }`}
                    />
                  </span>
                  <span className="text-micro uppercase text-muted">
                    {streamStatus === "connected" ? "Live" : "Polling"}
                  </span>
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
                onClick={() => setDemoMode(!demoMode)}
                whileHover={reduced ? undefined : { y: -1 }}
                whileTap={{ scale: 0.96 }}
                aria-pressed={demoMode}
                className={`rounded-md border px-3.5 py-1.5 font-sans text-meta font-medium transition-colors duration-fast ${
                  demoMode
                    ? "border-accent/60 bg-accent/15 text-accent shadow-glow"
                    : "border-edge bg-raised/60 text-muted hover:border-accent/50 hover:text-accent"
                }`}
              >
                {demoMode ? "Stop demo" : "Demo mode"}
              </motion.button>
            </div>
          </motion.div>
        </motion.section>

        <motion.section
          variants={rise}
          className="rounded-xl border border-edge bg-panel/80 p-5 shadow-panel"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-data font-semibold uppercase tracking-[0.12em] text-ink">
              Risk distribution
            </h2>
            <Link
              href="/analytics"
              className="font-sans text-meta text-muted transition-colors duration-fast hover:text-accent"
            >
              Full analytics →
            </Link>
          </div>
          {riskCounts ? (
            <RiskDistribution
              counts={riskCounts}
              scopeLabel={activeFeature ?? "all actions"}
            />
          ) : (
            <div className="shimmer h-8 w-full rounded" aria-hidden />
          )}
        </motion.section>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <motion.div variants={rise} className="flex min-h-[22rem] flex-col">
            <RecentActions actions={actions} loading={loading} />
          </motion.div>
          <motion.div variants={rise} className="flex min-h-[22rem] flex-col">
            <NeedsAttention pending={pending} />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
