"use client";

import { AnimatePresence, motion } from "framer-motion";

import type { AgentAction } from "@/lib/api";
import { RiskBadge, StatusLabel } from "@/components/ui/RiskBadge";
import { SkeletonRows } from "@/components/ui/Skeleton";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export type StreamStatus = "connected" | "reconnecting";

function ConnectionIndicator({ status }: { status: StreamStatus }) {
  if (status === "connected") {
    return (
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-risk-low">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-risk-low" />
        Live
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-risk-medium">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-risk-medium" />
      Reconnecting — polling
    </span>
  );
}

export function ActionFeed({
  actions,
  activeFeature,
  streamStatus,
  loading,
  onClearFilter,
  onInspect,
}: {
  actions: AgentAction[];
  activeFeature: string | null;
  streamStatus: StreamStatus;
  loading: boolean;
  onClearFilter: () => void;
  onInspect: (actionId: number) => void;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-edge bg-panel/95 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
      <div className="edge-sheen relative flex items-center justify-between border-b border-edge px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-ink">
            Live Action Feed
          </h2>
          <ConnectionIndicator status={streamStatus} />
        </div>
        {activeFeature && (
          <button
            onClick={onClearFilter}
            className="flex items-center gap-2 rounded border border-accent/40 bg-accent/10 px-2 py-1 text-[11px] text-accent transition hover:bg-accent/20"
          >
            {activeFeature}
            <span aria-hidden>&times;</span>
            <span className="sr-only">Clear feature filter</span>
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <SkeletonRows rows={8} />
        ) : actions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full border border-edge text-lg text-muted/60"
              aria-hidden
            >
              ⊘
            </span>
            <p className="text-xs text-muted">
              No actions logged{activeFeature ? ` for ${activeFeature}` : ""} yet.
            </p>
            <p className="text-[11px] text-muted/70">
              Run <code className="text-accent">python simulate_agent.py</code> to see the
              feed stream in.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-panel text-[10px] uppercase tracking-widest text-muted">
              <tr className="border-b border-edge">
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Risk</th>
                <th className="px-4 py-2 font-medium">Feature</th>
                <th className="px-4 py-2 text-right font-medium">Tokens</th>
                <th className="px-4 py-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {actions.map((action) => (
                  <motion.tr
                    key={action.id}
                    layout
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ type: "spring", stiffness: 520, damping: 42 }}
                    whileHover={{ backgroundColor: "rgba(34,211,238,0.06)" }}
                    onClick={() => onInspect(action.id)}
                    title="Open audit trail"
                    className="cursor-pointer border-b border-edge/50 align-top"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-muted tabular-nums">
                      {formatTime(action.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{action.action_type}</div>
                      <StatusLabel status={action.status} />
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge risk={action.risk_score} />
                      <p className="mt-1.5 max-w-[22rem] text-[11px] leading-snug text-muted">
                        {action.risk_reason}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-accent">
                      {action.feature_tag}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {action.tokens_used.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">
                      ${action.estimated_cost_usd.toFixed(5)}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
