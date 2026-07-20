"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";
import type { AgentAction } from "@/lib/api";

/**
 * The one widget on the overview that asks for action rather than reporting.
 *
 * It has two visually distinct states because they mean opposite things: a
 * queue that needs a human, and a clear queue. Making "nothing pending" look
 * like a dimmer version of "three pending" would bury the signal.
 */
export function NeedsAttention({ pending }: { pending: AgentAction[] }) {
  const { reduced } = useMotionPreference();
  const count = pending.length;
  const waiting = count > 0;

  return (
    <section
      className={`flex flex-col rounded-xl border shadow-panel transition-colors duration-base ${
        waiting ? "border-risk-medium/40 bg-risk-medium/[0.06]" : "border-edge bg-panel/80"
      }`}
    >
      <div className="flex items-center justify-between border-b border-edge/70 px-4 py-3">
        <h2 className="font-display text-data font-semibold uppercase tracking-[0.12em] text-ink">
          Needs attention
        </h2>
        {waiting && (
          <span className="flex items-center gap-1.5 text-micro uppercase text-risk-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-current breathe" aria-hidden />
            action required
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-baseline gap-2.5">
          <span
            className={`font-display text-hero font-bold tabular-nums ${
              waiting ? "text-risk-medium" : "text-muted"
            }`}
          >
            <AnimatedNumber value={count} />
          </span>
          <span className="font-sans text-sm text-muted">
            {count === 1 ? "action awaiting a decision" : "actions awaiting a decision"}
          </span>
        </div>

        <AnimatePresence initial={false} mode="popLayout">
          {waiting ? (
            <motion.ul
              key="queue"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 space-y-1.5"
            >
              {pending.slice(0, 3).map((action) => (
                <motion.li
                  key={action.id}
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={spring.snappy}
                  className="flex items-center justify-between gap-2 rounded border border-edge/70 bg-deep/40 px-2.5 py-1.5"
                >
                  <span className="truncate font-mono text-meta text-ink">
                    {action.action_type}
                  </span>
                  <RiskBadge risk={action.risk_score} pulse={false} />
                </motion.li>
              ))}
              {count > 3 && (
                <li className="px-2.5 pt-0.5 font-sans text-micro text-muted">
                  and {count - 3} more
                </li>
              )}
            </motion.ul>
          ) : (
            <motion.p
              key="clear"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 font-sans text-sm leading-relaxed text-muted"
            >
              Nothing is held for review. Actions that breach a policy at or above its
              threshold will queue here.
            </motion.p>
          )}
        </AnimatePresence>

        <Link
          href="/approvals"
          className={`mt-auto flex items-center justify-between rounded-md border px-3 py-2 font-sans text-meta transition-colors duration-fast ${
            waiting
              ? "border-risk-medium/40 bg-risk-medium/10 text-risk-medium hover:bg-risk-medium/20"
              : "border-edge text-muted hover:border-accent/40 hover:text-accent"
          } mt-4`}
        >
          Open approvals queue
          <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
