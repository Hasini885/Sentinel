"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { MARK } from "@/components/charts/palette";
import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";
import type { DowngradeSuggestion } from "@/lib/api";

export type Metric = "cost" | "tokens";

export type RoiRow = {
  feature_tag: string;
  cost: number;
  tokens: number;
  flagged: boolean;
  suggestion?: DowngradeSuggestion;
  roi_score: number | null;
  action_count: number;
};

function formatValue(row: RoiRow, metric: Metric): string {
  return metric === "cost"
    ? `$${row.cost.toFixed(5)}`
    : row.tokens.toLocaleString();
}

/**
 * Horizontal spend bars, one per feature.
 *
 * Hand-rolled rather than charted with Recharts: Recharts replays its entrance
 * animation from zero whenever `data` changes, so a feed that updates every few
 * seconds would make the bars flash and restart constantly. Animating width
 * directly means a bar springs from its *current* value to its new one, which
 * is what "smoothly transition when data updates" actually requires. It also
 * lets bars reorder with a layout animation as their ranking changes.
 *
 * Values are direct-labelled at the bar tip, so no x-axis is needed and no
 * value is gated behind a tooltip.
 */
export function FeatureRoiChart({
  rows,
  metric,
  activeFeature,
  onSelectFeature,
}: {
  rows: RoiRow[];
  metric: Metric;
  activeFeature: string | null;
  onSelectFeature: (tag: string) => void;
}) {
  const { reduced } = useMotionPreference();
  const [hovered, setHovered] = useState<string | null>(null);

  const max = Math.max(...rows.map((r) => (metric === "cost" ? r.cost : r.tokens)), 0);

  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row) => {
        const value = metric === "cost" ? row.cost : row.tokens;
        // Floor at 1.5% so a near-zero feature still shows a visible stub.
        const pct = max === 0 ? 0 : Math.max(1.5, (value / max) * 100);
        const selected = activeFeature === row.feature_tag;
        const dimmed = activeFeature !== null && !selected;

        return (
          <motion.li
            key={row.feature_tag}
            layout={!reduced}
            transition={spring.layout}
            onMouseEnter={() => setHovered(row.feature_tag)}
            onMouseLeave={() => setHovered(null)}
            animate={{ opacity: dimmed ? 0.4 : 1 }}
            className="relative"
          >
            <button
              onClick={() => onSelectFeature(row.feature_tag)}
              aria-pressed={selected}
              className="block w-full text-left"
            >
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-meta text-ink">{row.feature_tag}</span>
                  {row.flagged && <DowngradeBadge />}
                </span>
                {/* Direct label at the tip — the value is never tooltip-gated. */}
                <span className="shrink-0 text-meta tabular-nums text-muted">
                  {formatValue(row, metric)}
                </span>
              </div>

              <div className="h-3.5 w-full overflow-hidden rounded-sm bg-edge/40">
                <motion.div
                  className="h-full rounded-r-[4px]"
                  style={{ backgroundColor: row.flagged ? MARK.flagged : MARK.spend }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={reduced ? { duration: 0 } : spring.soft}
                />
              </div>
            </button>

            <AnimatePresence>
              {hovered === row.feature_tag && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.14 }}
                  className="pointer-events-none absolute left-0 top-full z-20 mt-1 w-64 rounded border border-edge bg-raised px-3 py-2 shadow-raised"
                >
                  <p className="text-meta font-medium text-ink">{row.feature_tag}</p>
                  <p className="mt-1 text-meta text-muted">
                    {metric === "cost"
                      ? `$${row.cost.toFixed(5)} across ${row.action_count} actions`
                      : `${row.tokens.toLocaleString()} tokens across ${row.action_count} actions`}
                  </p>
                  {row.roi_score !== null && (
                    <p className="text-meta text-muted">
                      ROI score {row.roi_score.toFixed(1)}
                    </p>
                  )}
                  {row.flagged && row.suggestion && (
                    <p className="mt-1.5 border-t border-edge pt-1.5 text-meta leading-snug text-muted">
                      {row.suggestion.reason}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.li>
        );
      })}
    </ul>
  );
}

/**
 * Marks a feature the backend suggests downgrading.
 *
 * The pulse is the one place in the dashboard where motion is used purely to
 * recruit attention — justified because this is an advisory the user is meant
 * to act on, and it is rare. It stops under reduced motion; the badge text
 * carries the meaning either way, so the signal is never motion-only.
 */
function DowngradeBadge() {
  const { reduced } = useMotionPreference();

  return (
    <span className="relative inline-flex shrink-0">
      {!reduced && (
        <motion.span
          className="absolute inset-0 rounded"
          style={{ backgroundColor: MARK.flagged }}
          animate={{ opacity: [0.45, 0, 0.45], scale: [1, 1.35, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
          aria-hidden
        />
      )}
      <span
        className="relative rounded border px-1 py-px text-micro font-bold uppercase"
        style={{
          borderColor: `${MARK.flagged}66`,
          backgroundColor: `${MARK.flagged}1A`,
          color: "#C4B5FD",
        }}
      >
        downgrade
      </span>
    </span>
  );
}
