"use client";

import { AnimatePresence, motion } from "framer-motion";

import { MARK } from "@/components/charts/palette";
import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";
import type { DowngradeSuggestion, FeatureROI } from "@/lib/api";

/**
 * Features the backend suggests routing to a cheaper model.
 *
 * These are advisories the user is meant to act on, so this is the one place
 * on the page where motion recruits attention rather than describing a change.
 * It is justified because the set is small and rare — if every feature were
 * flagged, the glow would stop meaning anything and should be removed.
 *
 * Violet throughout: it is distinct from both the cyan chrome and the
 * green/amber/red reserved for risk, so an advisory can never be misread as a
 * risk level.
 */
export function DowngradeAdvisories({
  features,
  suggestions,
  onDrillDown,
}: {
  features: FeatureROI[];
  suggestions: Record<string, DowngradeSuggestion>;
  onDrillDown: (tag: string) => void;
}) {
  const { reduced } = useMotionPreference();

  const flagged = features
    .map((f) => ({ feature: f, suggestion: suggestions[f.feature_tag] }))
    .filter((row) => row.suggestion?.suggest_downgrade);

  if (flagged.length === 0) {
    return (
      <p className="rounded-lg border border-edge bg-deep/40 px-4 py-5 text-center font-sans text-sm text-muted">
        No features are flagged. Spend is proportionate to the value each feature is
        returning.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      <AnimatePresence initial={false}>
        {flagged.map(({ feature, suggestion }) => (
          <motion.li
            key={feature.feature_tag}
            layout={!reduced}
            initial={reduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.soft}
            className="relative"
          >
            {/* Slow pulse behind the card. Decoration only — the badge text and
                the border carry the meaning when motion is off. */}
            {!reduced && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute -inset-px rounded-lg"
                style={{ backgroundColor: MARK.flagged }}
                animate={{ opacity: [0, 0.16, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}

            <motion.button
              onClick={() => onDrillDown(feature.feature_tag)}
              whileHover={reduced ? undefined : { x: 3 }}
              whileTap={{ scale: 0.995 }}
              transition={spring.snappy}
              className="relative flex w-full flex-col gap-2 rounded-lg border border-l-2 bg-panel/80 px-4 py-3 text-left transition-colors duration-fast"
              style={{ borderColor: `${MARK.flagged}55`, borderLeftColor: MARK.flagged }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-data font-medium text-ink">
                    {feature.feature_tag}
                  </span>
                  <span
                    className="rounded border px-1.5 py-0.5 text-micro font-bold uppercase"
                    style={{
                      borderColor: `${MARK.flagged}66`,
                      backgroundColor: `${MARK.flagged}1A`,
                      color: "#C4B5FD",
                    }}
                  >
                    downgrade
                  </span>
                </span>
                <span className="flex items-center gap-1.5 font-mono text-micro uppercase text-muted">
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ backgroundColor: MARK.flagged }}
                    aria-hidden
                  />
                  → {suggestion?.suggested_model}
                </span>
              </div>

              <p className="font-sans text-meta leading-relaxed text-muted">
                {suggestion?.reason}
              </p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-edge/60 pt-2 font-mono text-micro uppercase text-muted/70">
                <span>${feature.total_cost_usd.toFixed(5)} spent</span>
                <span>{feature.action_count} actions</span>
                {suggestion?.value_rate !== null && suggestion?.value_rate !== undefined && (
                  <span>{(suggestion.value_rate * 100).toFixed(0)}% valuable</span>
                )}
                <span className="ml-auto text-accent">inspect actions →</span>
              </div>
            </motion.button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
