"use client";

import { motion } from "framer-motion";

import { compositeOf, toneForScore, type Factor } from "@/components/feed/factors";
import { duration, ease } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";
import type { RiskScore } from "@/lib/api";

/**
 * The multi-factor risk breakdown revealed when a row expands.
 *
 * The bars grow from zero to their score every time the row opens. That is
 * deliberate: replaying the fill makes the relative magnitudes legible at a
 * glance, which a static bar does not. Widths animate rather than transform-
 * scale so the bar's right edge stays crisp and the label never skews.
 */
export function FactorBars({
  factors,
  riskScore,
}: {
  factors: Factor[];
  /** Server-assigned label, shown alongside the composite it came from. */
  riskScore: RiskScore;
}) {
  const { reduced } = useMotionPreference();
  const composite = compositeOf(factors);

  const RISK_TEXT: Record<RiskScore, string> = {
    low: "text-risk-low",
    medium: "text-risk-medium",
    high: "text-risk-high",
  };

  return (
    <div className="flex flex-col gap-2.5">
      {factors.map((factor, i) => (
        <div key={factor.key} className="flex items-start gap-3">
          <span className="w-32 shrink-0 pt-px text-meta text-muted">{factor.label}</span>

          <div className="mt-1 h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-edge">
            <motion.div
              className={`h-full rounded-full ${toneForScore(factor.score)}`}
              initial={{ width: 0 }}
              animate={{ width: `${factor.score * 10}%` }}
              transition={
                reduced
                  ? { duration: 0 }
                  : // Stagger the three so they read as a sequence, not a blur.
                    { duration: duration.slow, ease: ease.entrance, delay: 0.06 + i * 0.07 }
              }
            />
          </div>

          <span className="w-11 shrink-0 text-meta tabular-nums text-ink">
            {factor.score}/10
          </span>
          <span className="w-12 shrink-0 text-micro tabular-nums text-muted/70">
            ×{factor.weight}
          </span>

          {factor.reason && (
            <span className="min-w-0 flex-1 text-meta leading-snug text-muted">
              {factor.reason}
            </span>
          )}
        </div>
      ))}

      <div className="mt-1 flex items-center gap-3 border-t border-edge/60 pt-2.5">
        <span className="w-32 shrink-0 text-meta text-muted">Composite</span>
        <span className="text-meta tabular-nums text-ink">
          {composite.toFixed(2)}/10
        </span>
        <span aria-hidden className="text-muted">
          →
        </span>
        <span className={`text-meta font-bold uppercase ${RISK_TEXT[riskScore]}`}>
          {riskScore}
        </span>
      </div>
    </div>
  );
}
