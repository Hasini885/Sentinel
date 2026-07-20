"use client";

import { motion } from "framer-motion";

import { Sparkline } from "@/components/charts/Sparkline";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { rise } from "@/components/ui/motion";

export type StatTileProps = {
  /** Sentence case, no trailing colon. */
  label: string;
  value: number;
  /** Turns the animated value into display text (units, precision). */
  format: (n: number) => string;
  /** Secondary line under the value — the all-time figure, a count, etc. */
  hint?: string;
  /** Signed percent change vs earlier in the window. Null hides the delta. */
  delta?: number | null;
  /**
   * Whether a rising value is good. Drives the delta's colour, so a falling
   * cost reads as good and a rising blocked-rate reads as bad.
   * "neutral" keeps the delta in muted ink — used where direction has no
   * inherent polarity, like raw action volume.
   */
  polarity?: "up-good" | "up-bad" | "neutral";
  /** Trend series for the sparkline, oldest → newest. */
  series?: number[];
};

function deltaTone(delta: number, polarity: NonNullable<StatTileProps["polarity"]>): string {
  if (polarity === "neutral" || Math.abs(delta) < 0.5) return "text-muted";
  const good = polarity === "up-good" ? delta > 0 : delta < 0;
  return good ? "text-risk-low" : "text-risk-high";
}

/**
 * A headline number with its trend.
 *
 * `tabular-nums` on the value is a deliberate exception to the usual advice of
 * proportional figures for large standalone numbers: this value is animated on
 * every update, and proportional digits make it jitter horizontally while the
 * counter settles. Stable width beats slightly loose spacing when the number
 * moves.
 */
export function StatTile({
  label,
  value,
  format,
  hint,
  delta = null,
  polarity = "neutral",
  series,
}: StatTileProps) {
  return (
    <motion.div variants={rise} className="flex min-w-0 flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-micro uppercase text-muted">
        <span className="h-2.5 w-px bg-accent/60" aria-hidden />
        {label}
      </span>

      <div className="flex items-baseline gap-2">
        <span className="font-display text-stat font-semibold tabular-nums text-ink">
          <AnimatedNumber value={value} format={format} />
        </span>
        {delta !== null && (
          <span className={`text-micro tabular-nums ${deltaTone(delta, polarity)}`}>
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "="} {Math.abs(delta).toFixed(0)}%
          </span>
        )}
      </div>

      {series && series.length > 0 && (
        <Sparkline series={series} label={`${label} trend across the loaded window`} />
      )}

      {hint && <span className="truncate text-micro tabular-nums text-muted/70">{hint}</span>}
    </motion.div>
  );
}
