"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { approveAction, rejectAction, type AgentAction } from "@/lib/api";
import { RiskBadge } from "@/components/Badges";
import { SkeletonRows } from "@/components/Skeleton";

export function PendingApprovals({
  pending,
  loading,
  onDecided,
}: {
  pending: AgentAction[];
  loading: boolean;
  onDecided: () => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(id: number, decision: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      await (decision === "approve" ? approveAction(id) : rejectAction(id));
      onDecided();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="flex flex-col rounded-xl border border-risk-medium/30 bg-panel shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between border-b border-edge px-4 py-3">
        <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-ink">
          Pending Approvals
        </h2>
        {pending.length > 0 && (
          <span className="flex items-center gap-1.5 rounded-full border border-risk-medium/30 bg-risk-medium/15 px-2 py-0.5 text-[10px] font-bold text-risk-medium">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden />
            {pending.length} waiting
          </span>
        )}
      </div>

      {error && (
        <p className="border-b border-risk-high/30 bg-risk-high/10 px-4 py-2 text-[11px] text-risk-high">
          {error}
        </p>
      )}

      <div className="max-h-72 overflow-y-auto">
        {loading ? (
          <SkeletonRows rows={2} />
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-4 py-7 text-center">
            <span className="text-sm text-risk-low/80" aria-hidden>
              ✓
            </span>
            <p className="text-xs text-muted">Nothing is waiting on a human.</p>
          </div>
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {pending.map((action) => (
                <motion.li
                  key={action.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.25 } }}
                  transition={{ type: "spring", stiffness: 380, damping: 40 }}
                  className="overflow-hidden border-b border-edge/50 px-4 py-3 last:border-0"
                >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-ink">
                        {action.action_type}
                      </span>
                      <RiskBadge risk={action.risk_score} />
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-muted">
                      {action.risk_reason}
                    </p>
                    <pre className="mt-2 max-h-24 overflow-auto rounded border border-edge bg-deep px-2 py-1.5 text-[10px] leading-relaxed text-muted">
                      {JSON.stringify(action.action_payload, null, 2)}
                    </pre>
                  </div>

                  <div className="flex shrink-0 flex-col gap-1.5">
                    <motion.button
                      onClick={() => decide(action.id, "approve")}
                      disabled={busyId === action.id}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      className="rounded border border-risk-low/40 bg-risk-low/10 px-3 py-1 text-[11px] font-medium text-risk-low transition hover:bg-risk-low/20 hover:shadow-[0_0_12px_rgba(52,211,153,0.25)] disabled:opacity-40"
                    >
                      Approve
                    </motion.button>
                    <motion.button
                      onClick={() => decide(action.id, "reject")}
                      disabled={busyId === action.id}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      className="rounded border border-risk-high/40 bg-risk-high/10 px-3 py-1 text-[11px] font-medium text-risk-high transition hover:bg-risk-high/20 hover:shadow-[0_0_12px_rgba(244,63,94,0.25)] disabled:opacity-40"
                    >
                      Reject
                    </motion.button>
                  </div>
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
