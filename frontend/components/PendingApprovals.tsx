"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { RiskBadge } from "@/components/ui/RiskBadge";
import { EmptyState } from "@/components/ui/States";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";
import { useToast } from "@/components/ui/Toast";
import { approveAction, rejectAction, type AgentAction } from "@/lib/api";

/**
 * Decision buttons.
 *
 * The press feedback is deliberately physical — scale down on tap, spring back
 * — because these are the only irreversible controls on the dashboard. A
 * decision should feel like it was made, not like a link was clicked.
 */
function DecisionButton({
  tone,
  busy,
  onClick,
  children,
}: {
  tone: "approve" | "reject";
  busy: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const { reduced } = useMotionPreference();
  const styles =
    tone === "approve"
      ? "border-risk-low/40 bg-risk-low/10 text-risk-low hover:bg-risk-low/20 hover:shadow-[0_0_12px_rgb(52_211_153_/_0.25)]"
      : "border-risk-high/40 bg-risk-high/10 text-risk-high hover:bg-risk-high/20 hover:shadow-[0_0_12px_rgb(244_63_94_/_0.25)]";

  return (
    <motion.button
      onClick={onClick}
      disabled={busy}
      whileHover={reduced ? undefined : { scale: 1.04 }}
      whileTap={reduced ? undefined : { scale: 0.92 }}
      transition={spring.snappy}
      className={`flex items-center justify-center gap-1.5 rounded border px-3 py-1 text-meta font-medium transition-colors duration-fast disabled:opacity-40 ${styles}`}
    >
      {busy && !reduced && (
        <motion.span
          className="h-2 w-2 rounded-full border border-current border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
          aria-hidden
        />
      )}
      {children}
    </motion.button>
  );
}

export function PendingApprovals({
  pending,
  loading,
  demoMode = false,
  onDemoDecide,
  onDecided,
}: {
  pending: AgentAction[];
  loading: boolean;
  /** In demo mode decisions resolve locally — there is no row to PATCH. */
  demoMode?: boolean;
  onDemoDecide?: (id: number, decision: "approve" | "reject") => void;
  onDecided: () => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const toast = useToast();

  async function decide(action: AgentAction, decision: "approve" | "reject") {
    if (demoMode) {
      onDemoDecide?.(action.id, decision);
      toast.push({
        tone: decision === "approve" ? "success" : "danger",
        title: decision === "approve" ? "Action approved" : "Action rejected",
        detail: `${action.action_type} — simulated decision.`,
      });
      return;
    }

    setBusyId(action.id);
    try {
      await (decision === "approve" ? approveAction(action.id) : rejectAction(action.id));
      toast.push({
        tone: decision === "approve" ? "success" : "danger",
        title: decision === "approve" ? "Action approved" : "Action rejected",
        detail: `${action.action_type} — recorded in the audit trail.`,
      });
      onDecided();
    } catch (err) {
      // Errors go to a toast rather than an inline banner so the list does not
      // reflow underneath the buttons the user is still aiming at.
      toast.push({
        tone: "danger",
        title: "Decision failed",
        detail: err instanceof Error ? err.message : "Could not reach the API.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="flex flex-col rounded-xl border border-risk-medium/30 bg-panel shadow-panel">
      <div className="flex items-center justify-between border-b border-edge px-4 py-3">
        <h2 className="font-display text-data font-semibold uppercase tracking-[0.12em] text-ink">
          Pending Approvals
        </h2>
        <AnimatePresence initial={false}>
          {pending.length > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={spring.snappy}
              className="flex items-center gap-1.5 rounded-full border border-risk-medium/30 bg-risk-medium/15 px-2 py-0.5 text-micro font-bold text-risk-medium"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current breathe" aria-hidden />
              {pending.length} waiting
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {loading ? (
          <SkeletonRows rows={2} />
        ) : pending.length === 0 ? (
          <EmptyState
            title="Nothing is waiting on a human"
            body="Actions that breach a policy at or above its threshold queue here for a decision."
          />
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {pending.map((action) => (
                <motion.li
                  key={action.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0, x: 24, transition: { duration: 0.25 } }}
                  transition={spring.layout}
                  className="overflow-hidden border-b border-edge/50 px-4 py-3 last:border-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-data font-medium text-ink">
                          {action.action_type}
                        </span>
                        <RiskBadge risk={action.risk_score} />
                      </div>
                      <p className="mt-1 text-meta leading-snug text-muted">
                        {action.risk_reason}
                      </p>
                      <pre className="mt-2 max-h-24 overflow-auto rounded border border-edge bg-deep px-2 py-1.5 text-micro leading-relaxed tracking-normal text-muted">
                        {JSON.stringify(action.action_payload, null, 2)}
                      </pre>
                    </div>

                    <div className="flex shrink-0 flex-col gap-1.5">
                      <DecisionButton
                        tone="approve"
                        busy={busyId === action.id}
                        onClick={() => void decide(action, "approve")}
                      >
                        Approve
                      </DecisionButton>
                      <DecisionButton
                        tone="reject"
                        busy={busyId === action.id}
                        onClick={() => void decide(action, "reject")}
                      >
                        Reject
                      </DecisionButton>
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
