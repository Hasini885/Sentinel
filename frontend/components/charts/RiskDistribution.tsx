"use client";

import { motion } from "framer-motion";

import { CHART_SURFACE, RISK_FILL } from "@/components/charts/palette";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";
import type { RiskScore } from "@/lib/api";

/** Ordered low → high. Order is meaningful: this is a severity scale. */
const ORDER: RiskScore[] = ["low", "medium", "high"];

const LABEL: Record<RiskScore, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/** Below this share, an inline label will not fit without being clipped. */
const INLINE_LABEL_MIN_PCT = 14;

export type RiskDistributionProps = {
  counts: Record<RiskScore, number>;
  /** Named so the caption can say what the proportions are actually of. */
  scopeLabel: string;
};

/**
 * Proportional split of actions by risk severity.
 *
 * A horizontal stacked bar, not a donut: the reader's job is comparing three
 * shares, and close values are far easier to compare along a common baseline
 * than as arcs.
 *
 * The 2px surface gaps, the direct labels, and the legend are all REQUIRED, not
 * stylistic. The severity fills separate at CVD ΔE 7.9, inside the 6–8 floor
 * band, which the palette validator permits only alongside secondary encoding.
 * Strip these and the chart stops being colourblind-safe. See charts/palette.ts.
 */
export function RiskDistribution({ counts, scopeLabel }: RiskDistributionProps) {
  const { reduced } = useMotionPreference();
  const total = ORDER.reduce((sum, key) => sum + counts[key], 0);

  if (total === 0) {
    return (
      <p className="py-3 text-center text-meta text-muted">
        No actions scored yet — the risk split appears once the first action lands.
      </p>
    );
  }

  const shares = ORDER.map((key) => ({
    key,
    count: counts[key],
    pct: (counts[key] / total) * 100,
  })).filter((s) => s.count > 0);

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className="flex h-8 w-full overflow-hidden rounded"
        style={{ gap: 2, backgroundColor: CHART_SURFACE }}
        role="img"
        aria-label={
          `Risk distribution across ${scopeLabel}: ` +
          ORDER.map((k) => `${LABEL[k]} ${counts[k]}`).join(", ")
        }
      >
        {shares.map(({ key, count, pct }) => (
          <motion.div
            key={key}
            layout={!reduced}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={reduced ? { duration: 0 } : spring.soft}
            className="flex items-center justify-center overflow-hidden first:rounded-l last:rounded-r"
            style={{ backgroundColor: RISK_FILL[key] }}
            title={`${LABEL[key]}: ${count} of ${total} (${pct.toFixed(1)}%)`}
          >
            {/* Only label inline when the segment is genuinely wide enough;
                otherwise the legend below carries the value, never a clipped
                label. The fade is delayed until the bar has finished growing,
                so the text is never briefly clipped by its own mark mid-
                animation. White is chosen against these fills' luminance. */}
            {pct >= INLINE_LABEL_MIN_PCT && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={reduced ? { duration: 0 } : { delay: 0.3, duration: 0.2 }}
                className="px-2 text-micro font-bold uppercase text-white/95"
              >
                {pct.toFixed(0)}%
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Legend doubles as the table view: every count is readable here even
          when its segment was too narrow to label inline. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {ORDER.map((key) => (
          <span key={key} className="flex items-center gap-1.5 text-meta">
            <span
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: RISK_FILL[key] }}
              aria-hidden
            />
            <span className="text-muted">{LABEL[key]}</span>
            {/* Text wears a text token, never the mark colour — the swatch to
                its left is what carries identity. Colouring both is redundant
                and puts a light hue where it has to work as text. */}
            <span className="font-medium tabular-nums text-ink">
              <AnimatedNumber value={counts[key]} />
            </span>
          </span>
        ))}
        <span className="ml-auto text-micro uppercase text-muted/70">
          {scopeLabel}
        </span>
      </div>
    </div>
  );
}
