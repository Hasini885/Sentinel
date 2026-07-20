"use client";

import { motion } from "framer-motion";

import { MARK } from "@/components/charts/palette";
import { EmptyState } from "@/components/ui/States";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";
import type { DowngradeSuggestion, FeatureROI } from "@/lib/api";

/**
 * Animated switch.
 *
 * The knob slides on a spring and the track colour crossfades, so the state
 * change is legible even at a glance. `role="switch"` with aria-checked is what
 * makes it a real control to assistive tech — a styled div would not be.
 */
function Switch({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  const { reduced } = useMotionPreference();

  return (
    <button
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onToggle}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-base ${
        enabled ? "bg-accent/70" : "bg-edge"
      }`}
    >
      <motion.span
        className="absolute top-0.5 h-4 w-4 rounded-full bg-panel shadow-sm"
        animate={{ left: enabled ? "1.25rem" : "0.125rem" }}
        transition={reduced ? { duration: 0 } : spring.snappy}
      />
    </button>
  );
}

export function AutoDowngradeSettings({
  features,
  suggestions,
  autoDowngrade,
  loading,
  onToggle,
}: {
  features: FeatureROI[];
  suggestions: Record<string, DowngradeSuggestion>;
  autoDowngrade: Record<string, boolean>;
  loading: boolean;
  onToggle: (tag: string, enabled: boolean) => void;
}) {
  const { reduced } = useMotionPreference();

  if (loading) return <SkeletonRows rows={4} />;

  if (features.length === 0) {
    return (
      <EmptyState
        title="No features yet"
        body="Per-feature routing appears once agents have run actions that can be attributed to a feature."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {features.map((feature) => {
        const enabled = autoDowngrade[feature.feature_tag] ?? false;
        const flagged = suggestions[feature.feature_tag]?.suggest_downgrade ?? false;

        return (
          <motion.li
            key={feature.feature_tag}
            layout={!reduced}
            transition={spring.layout}
            className="flex items-center justify-between gap-4 rounded-lg border border-edge bg-deep/40 px-3.5 py-2.5"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-mono text-data text-ink">
                  {feature.feature_tag}
                </span>
                {flagged && (
                  <span
                    className="shrink-0 rounded border px-1.5 py-px text-micro font-bold uppercase"
                    style={{
                      borderColor: `${MARK.flagged}66`,
                      backgroundColor: `${MARK.flagged}1A`,
                      color: "#C4B5FD",
                    }}
                  >
                    suggested
                  </span>
                )}
                {enabled && (
                  <span className="shrink-0 rounded border border-accent/40 bg-accent/10 px-1.5 py-px text-micro font-bold uppercase text-accent">
                    auto
                  </span>
                )}
              </div>
              <p className="mt-0.5 font-mono text-micro tabular-nums text-muted/70">
                ${feature.total_cost_usd.toFixed(5)} · {feature.action_count} actions
              </p>
            </div>

            <Switch
              enabled={enabled}
              onToggle={() => onToggle(feature.feature_tag, !enabled)}
              label={`Auto-downgrade ${feature.feature_tag}`}
            />
          </motion.li>
        );
      })}
    </ul>
  );
}
