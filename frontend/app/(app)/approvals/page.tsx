"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { ApprovalCard } from "@/components/approvals/ApprovalCard";
import { useSentinelData } from "@/components/data/SentinelDataProvider";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { rise, spring, stagger } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";
import { useToast } from "@/components/ui/Toast";
import { approveAction, rejectAction, API_BASE, type AgentAction } from "@/lib/api";

/**
 * The decision queue.
 *
 * A decided card animates out and the list closes the gap, so the queue
 * visibly shrinks — the reviewer's progress is the main feedback. The toast
 * carries the confirmation because by the time it appears, the card it refers
 * to is already gone.
 */
export default function ApprovalsPage() {
  const { pending, loading, unreachable, demoMode, demoDecide, refresh } =
    useSentinelData();

  const [busyId, setBusyId] = useState<number | null>(null);
  const toast = useToast();
  const { reduced } = useMotionPreference();

  async function decide(action: AgentAction, decision: "approve" | "reject") {
    if (demoMode) {
      demoDecide(action.id, decision);
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
      refresh();
    } catch (err) {
      // A toast rather than an inline banner: an error inserted into the list
      // would reflow the cards the user is still aiming at.
      toast.push({
        tone: "danger",
        title: "Decision failed",
        detail: err instanceof Error ? err.message : "Could not reach the API.",
      });
    } finally {
      setBusyId(null);
    }
  }

  if (unreachable) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-xl border border-edge bg-panel/80">
          <ErrorState
            title="Can't reach the Sentinel API"
            body={
              <>
                The approvals queue could not load from{" "}
                <code className="text-ink">{API_BASE}</code>. Start the backend and retry.
              </>
            }
            onRetry={refresh}
          />
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
        className="flex w-full flex-col gap-4 p-4 sm:p-6"
      >
        <motion.div
          variants={rise}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-edge bg-panel/80 px-5 py-4 shadow-panel"
        >
          <div>
            <h2 className="font-display text-data font-semibold uppercase tracking-[0.12em] text-ink">
              Awaiting decision
            </h2>
            <p className="mt-1 font-sans text-meta text-muted">
              Actions that breached a policy at or above its threshold.
            </p>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`font-display text-hero font-bold tabular-nums ${
                pending.length > 0 ? "text-risk-medium" : "text-muted"
              }`}
            >
              <AnimatedNumber value={pending.length} />
            </span>
            <span className="font-sans text-sm text-muted">
              {pending.length === 1 ? "action" : "actions"}
            </span>
          </div>
        </motion.div>

        {loading ? (
          <motion.div
            variants={rise}
            className="rounded-xl border border-edge bg-panel/80 shadow-panel"
          >
            <SkeletonRows rows={3} />
          </motion.div>
        ) : pending.length === 0 ? (
          <motion.div
            variants={rise}
            className="rounded-xl border border-edge bg-panel/80 shadow-panel"
          >
            <EmptyState
              title="Nothing is waiting on a human"
              body="When an action breaches a policy set to require_approval, it pauses here until you decide. Nothing is currently held."
            />
          </motion.div>
        ) : (
          <motion.ul
            variants={rise}
            className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {pending.map((action) => (
                <motion.li
                  key={action.id}
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={
                    reduced
                      ? { opacity: 0 }
                      : { opacity: 0, x: 40, scale: 0.97, transition: { duration: 0.28 } }
                  }
                  transition={spring.soft}
                >
                  <ApprovalCard
                    action={action}
                    busy={busyId === action.id}
                    onDecide={(decision) => void decide(action, decision)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </motion.div>
    </div>
  );
}
