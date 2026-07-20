"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import { RiskBadge, StatusLabel } from "@/components/ui/RiskBadge";
import { EmptyState } from "@/components/ui/States";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";
import type { AgentAction } from "@/lib/api";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const PREVIEW = 6;

/**
 * Compact preview of the newest actions.
 *
 * Deliberately not a smaller copy of the full feed: no filters, no expansion,
 * no audit link. It answers "is anything happening" and hands off to /actions
 * for anything more. Duplicating the feed's interactions here would mean two
 * implementations of the same behaviour drifting apart.
 */
export function RecentActions({
  actions,
  loading,
}: {
  actions: AgentAction[];
  loading: boolean;
}) {
  const { reduced } = useMotionPreference();
  const preview = actions.slice(0, PREVIEW);

  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-edge bg-panel/90 shadow-panel">
      <div className="edge-sheen relative flex items-center justify-between border-b border-edge px-4 py-3">
        <h2 className="font-display text-data font-semibold uppercase tracking-[0.12em] text-ink">
          Recent actions
        </h2>
        <Link
          href="/actions"
          className="font-sans text-meta text-muted transition-colors duration-fast hover:text-accent"
        >
          View all →
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <SkeletonRows rows={5} />
        ) : preview.length === 0 ? (
          <EmptyState
            title="Nothing yet"
            body="Actions appear here the moment an agent attempts one."
            hint={<code className="text-accent">python simulate_agent.py</code>}
          />
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {preview.map((action) => (
                <motion.li
                  key={action.id}
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={reduced ? { duration: 0 } : spring.snappy}
                  className="border-b border-edge/50 px-4 py-2.5 last:border-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <RiskBadge risk={action.risk_score} />
                      <span className="truncate font-mono text-data text-ink">
                        {action.action_type}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden font-mono text-micro tabular-nums text-muted/70 sm:inline">
                        ${action.estimated_cost_usd.toFixed(5)}
                      </span>
                      <span className="font-mono text-micro tabular-nums text-muted">
                        {formatTime(action.timestamp)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusLabel status={action.status} />
                    <span className="truncate font-mono text-micro text-accent">
                      {action.feature_tag}
                    </span>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </section>
  );
}
