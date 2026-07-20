"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { ActionRow } from "@/components/feed/ActionRow";
import { FeedFilters, type RiskFilter, type StatusFilter } from "@/components/feed/FeedFilters";
import { GRID } from "@/components/feed/grid";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { EmptyState } from "@/components/ui/States";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";
import type { AgentAction } from "@/lib/api";

export type StreamStatus = "connected" | "reconnecting";

/**
 * Rows near the top get Framer layout animation; the rest do not.
 *
 * Layout animation measures every participating element on each reflow, which
 * is the dominant cost at 100+ rows. Reordering is only ever *seen* near the
 * top of a reverse-chronological feed, so paying for it below the fold buys
 * nothing. Rows past this index still animate in and out — they simply do not
 * animate their reflow.
 */
const LAYOUT_ANIMATED_ROWS = 24;

/** How long a newly arrived row keeps its "just landed" pulse. */
const FRESH_MS = 4000;

function ConnectionIndicator({ status }: { status: StreamStatus }) {
  const live = status === "connected";
  // Gated explicitly: MotionConfig drops the scale transform under reduced
  // motion but leaves opacity animating, so the dot would blink forever. The
  // "Live" text carries the state either way — the pulse is never the only cue.
  const { reduced } = useMotionPreference();

  return (
    <span
      className={`flex items-center gap-1.5 text-micro uppercase ${
        live ? "text-risk-low" : "text-risk-medium"
      }`}
    >
      <span className="relative flex h-1.5 w-1.5" aria-hidden>
        {live && !reduced && (
          <motion.span
            className="absolute inline-flex h-full w-full rounded-full bg-risk-low"
            animate={{ scale: [1, 2.6, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
            live ? "bg-risk-low" : "bg-risk-medium"
          }`}
        />
      </span>
      {live ? "Live" : "Reconnecting — polling"}
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
  const { reduced } = useMotionPreference();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Status and risk filter the already-loaded window client-side. That keeps the
  // transition animated and instant — a refetch would hard-swap the list and
  // there would be nothing left to animate out. The feature filter stays
  // server-side (owned by the page) because it needs to reach past this window.
  const visible = useMemo(
    () =>
      actions.filter(
        (a) =>
          (status === "all" || a.status === status) &&
          (risk === "all" || a.risk_score === risk),
      ),
    [actions, status, risk],
  );

  // Track which rows arrived after the initial load so they can pulse briefly.
  const seen = useRef<Set<number>>(new Set());
  const primed = useRef(false);
  const [fresh, setFresh] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (actions.length === 0) return;

    if (!primed.current) {
      // First real payload: everything in it is history, not an arrival.
      actions.forEach((a) => seen.current.add(a.id));
      primed.current = true;
      return;
    }

    const arrived = actions.filter((a) => !seen.current.has(a.id)).map((a) => a.id);
    if (arrived.length === 0) return;
    arrived.forEach((id) => seen.current.add(id));

    setFresh((prev) => {
      const next = new Set(prev);
      arrived.forEach((id) => next.add(id));
      return next;
    });

    const timer = setTimeout(() => {
      setFresh((prev) => {
        const next = new Set(prev);
        arrived.forEach((id) => next.delete(id));
        return next;
      });
    }, FRESH_MS);
    return () => clearTimeout(timer);
  }, [actions]);

  const filtered = status !== "all" || risk !== "all" || activeFeature !== null;

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-edge bg-panel/95 shadow-panel">
      <div className="edge-sheen relative flex items-center justify-between gap-3 border-b border-edge px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-data font-semibold uppercase tracking-[0.12em] text-ink">
            Live Action Feed
          </h2>
          <ConnectionIndicator status={streamStatus} />
        </div>
        <span className="text-micro uppercase tabular-nums text-muted">
          <AnimatedNumber value={visible.length} />
          {filtered && ` of ${actions.length}`} shown
        </span>
      </div>

      <FeedFilters
        status={status}
        risk={risk}
        feature={activeFeature}
        onStatusChange={setStatus}
        onRiskChange={setRisk}
        onClearFeature={onClearFilter}
      />

      <div className={`${GRID} border-b border-edge px-4 py-2 text-micro uppercase text-muted`}>
        <span>Time</span>
        <span>Action</span>
        <span>Risk</span>
        <span>Feature</span>
        <span className="text-right">Tokens</span>
        <span className="text-right">Cost</span>
        <span />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <SkeletonRows rows={8} />
        ) : visible.length === 0 ? (
          actions.length === 0 ? (
            <EmptyState
              title="Waiting for the first action"
              body="Every tool call an agent attempts is intercepted, scored, and checked against your policies before it runs. Nothing has come through yet."
              hint={<code className="text-accent">python simulate_agent.py</code>}
            />
          ) : (
            <EmptyState
              title="No actions match these filters"
              body={`${actions.length} action${actions.length === 1 ? " is" : "s are"} hidden by the current status or risk filter.`}
            />
          )
        ) : (
          <motion.ul layout={!reduced} transition={spring.layout}>
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((action, index) => (
                <ActionRow
                  key={action.id}
                  action={action}
                  expanded={expandedId === action.id}
                  onToggle={() =>
                    setExpandedId((current) => (current === action.id ? null : action.id))
                  }
                  onInspect={() => onInspect(action.id)}
                  fresh={fresh.has(action.id)}
                  animateLayout={index < LAYOUT_ANIMATED_ROWS}
                />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </section>
  );
}
