"use client";

import { motion } from "framer-motion";

import { SPARK } from "@/components/charts/palette";
import { duration, ease } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";

export type SparklineProps = {
  /** One value per time bucket, oldest → newest. */
  series: number[];
  /** Accessible description; the trend is otherwise a decorative graphic. */
  label: string;
  className?: string;
};

/**
 * Micro-column trend for a stat tile.
 *
 * Columns rather than a polyline: an SVG path's `d` cannot be tweened between
 * arbitrary shapes, so a line sparkline would have to snap on every poll. Each
 * column is its own element, so live updates spring to their new height and the
 * series stays readable while it changes — which is the whole point of putting
 * a trend next to a live number.
 *
 * The latest column wears the accent so "now" is locatable at a glance; the
 * rest recede.
 */
export function Sparkline({ series, label, className = "" }: SparklineProps) {
  const { reduced } = useMotionPreference();

  if (series.length === 0) return null;

  const max = Math.max(...series);
  const lastIndex = series.length - 1;

  return (
    <div
      className={`flex h-6 items-end gap-[2px] ${className}`}
      role="img"
      aria-label={label}
    >
      {series.map((value, i) => {
        // Floor at 8% so an empty bucket still shows a baseline tick rather than
        // vanishing, which would misread as "no data here" instead of "zero".
        const pct = max === 0 ? 8 : Math.max(8, (value / max) * 100);
        const latest = i === lastIndex;
        return (
          <motion.span
            key={i}
            className="w-full rounded-[1px]"
            style={{ backgroundColor: latest ? SPARK.latest : SPARK.history }}
            initial={{ height: 0 }}
            animate={{ height: `${pct}%` }}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: duration.slow, ease: ease.entrance, delay: i * 0.02 }
            }
          />
        );
      })}
    </div>
  );
}
