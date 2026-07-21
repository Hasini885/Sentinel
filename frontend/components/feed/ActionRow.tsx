"use client";

import { forwardRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { FactorBars } from "@/components/feed/FactorBars";
import { factorsOf } from "@/components/feed/factors";
import { GRID, WIDE_ONLY } from "@/components/feed/grid";
import { RiskBadge, StatusLabel } from "@/components/ui/RiskBadge";
import { duration, ease, spring } from "@/components/ui/motion";
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

/** Risk tint used for the arrival flash, as an rgba string. */
const FLASH: Record<string, string> = {
  low: "rgba(52, 211, 153, 0.16)",
  medium: "rgba(245, 158, 11, 0.16)",
  high: "rgba(244, 63, 94, 0.18)",
};
const TRANSPARENT = "rgba(0, 0, 0, 0)";

export type ActionRowProps = {
  action: AgentAction;
  expanded: boolean;
  onToggle: () => void;
  /** Opens the full audit trail drawer. */
  onInspect: () => void;
  /** True for rows that arrived after the feed loaded — drives the flash. */
  fresh: boolean;
  /**
   * Layout animation is measured per element on every reflow, so it is only
   * worth paying for on rows near the top where reordering is actually seen.
   */
  animateLayout: boolean;
};

/**
 * Ref-forwarding is required, not cosmetic: AnimatePresence in `popLayout` mode
 * takes a DOM ref from each child so it can pop exiting rows out of flow. A
 * plain function component cannot receive one, and exit animations would break.
 */
export const ActionRow = forwardRef<HTMLLIElement, ActionRowProps>(function ActionRow(
  { action, expanded, onToggle, onInspect, fresh, animateLayout },
  ref,
) {
  const { reduced } = useMotionPreference();
  const factors = factorsOf(action);

  return (
    <motion.li
      ref={ref}
      layout={animateLayout && !reduced ? "position" : false}
      // initial fires only for rows mounting after the first paint, because the
      // parent AnimatePresence sets initial={false} — so existing rows stay put
      // on load and only genuine arrivals animate in.
      initial={{ opacity: 0, y: -14, backgroundColor: FLASH[action.risk_score] ?? TRANSPARENT }}
      animate={{ opacity: 1, y: 0, backgroundColor: TRANSPARENT }}
      exit={{ opacity: 0, x: 24, transition: { duration: duration.fast, ease: ease.exit } }}
      transition={
        reduced
          ? { duration: 0 }
          : { ...spring.snappy, backgroundColor: { duration: 1.4, ease: ease.exit } }
      }
      className="border-b border-edge/50 last:border-0"
      // Lets the browser skip painting rows scrolled out of view without
      // unmounting them, so layout animation and exit animation still work.
      // A JS virtualiser would unmount them and break both.
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 56px" }}
    >
      <motion.div
        onClick={onToggle}
        whileHover={reduced ? undefined : { backgroundColor: "rgba(58, 231, 255, 0.05)" }}
        className={`${GRID} cursor-pointer items-start px-4 py-3`}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <span className="flex items-center gap-1.5 whitespace-nowrap text-muted tabular-nums">
          {fresh && !reduced && (
            <motion.span
              layout
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              aria-label="just arrived"
            />
          )}
          {formatTime(action.timestamp)}
        </span>

        <span className="min-w-0">
          <span className="block truncate font-medium text-ink">{action.action_type}</span>
          <StatusLabel status={action.status} />
        </span>

        <span>
          <RiskBadge risk={action.risk_score} />
        </span>

        <span className={`${WIDE_ONLY} min-w-0 truncate text-accent`}>
          {action.feature_tag}
        </span>

        <span className={`${WIDE_ONLY} text-right tabular-nums text-muted`}>
          {action.tokens_used.toLocaleString()}
        </span>

        <span className={`${WIDE_ONLY} text-right tabular-nums text-ink`}>
          ${action.estimated_cost_usd.toFixed(5)}
        </span>

        <motion.span
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={reduced ? { duration: 0 } : spring.snappy}
          className="text-center text-muted"
          aria-hidden
        >
          ›
        </motion.span>
      </motion.div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              reduced ? { duration: 0 } : { duration: duration.base, ease: ease.standard }
            }
            className="overflow-hidden"
          >
            <div className="border-t border-edge/50 bg-deep/40 px-4 py-3.5">
              <p className="mb-3 text-meta leading-snug text-muted">{action.risk_reason}</p>

              {factors ? (
                <FactorBars factors={factors} riskScore={action.risk_score} />
              ) : (
                <p className="text-meta text-muted/70">
                  This action predates multi-factor scoring — no sub-scores were recorded.
                </p>
              )}

              <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-edge/60 pt-3 text-micro uppercase text-muted">
                {/* Below md these three have no column of their own, so the
                    detail panel is where they live. Shown only there to avoid
                    repeating what the row already displays on wider screens. */}
                <span className="text-accent md:hidden">{action.feature_tag}</span>
                <span className="tabular-nums md:hidden">
                  {action.tokens_used.toLocaleString()} tokens
                </span>
                <span className="tabular-nums md:hidden">
                  ${action.estimated_cost_usd.toFixed(5)}
                </span>
                <span>{action.agent_name}</span>
                {action.model_used && <span>scored with {action.model_used}</span>}
                {action.downgraded && <span className="text-accent">auto-downgraded</span>}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspect();
                  }}
                  className="ml-auto rounded border border-edge px-2 py-1 tracking-normal text-muted transition-colors duration-fast hover:border-accent/50 hover:text-accent"
                >
                  Full audit trail →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
});
