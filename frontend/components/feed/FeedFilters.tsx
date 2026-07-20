"use client";

import { AnimatePresence, motion } from "framer-motion";

import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";
import type { ActionStatus, RiskScore } from "@/lib/api";

export type StatusFilter = ActionStatus | "all";
export type RiskFilter = RiskScore | "all";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "executed", label: "Executed" },
  { value: "pending_approval", label: "Pending" },
  { value: "blocked", label: "Blocked" },
];

const RISK_OPTIONS: { value: RiskFilter; label: string; dot: string }[] = [
  { value: "all", label: "All", dot: "bg-muted" },
  { value: "low", label: "Low", dot: "bg-risk-low" },
  { value: "medium", label: "Med", dot: "bg-risk-medium" },
  { value: "high", label: "High", dot: "bg-risk-high" },
];

/**
 * Segmented filter control.
 *
 * The selected background is one shared element moved with `layoutId`, so it
 * slides between segments instead of cross-fading — the same technique as the
 * sidebar's active pill, and the reason both feel like one continuous object
 * rather than a set of independently toggling boxes.
 */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  label,
}: {
  options: { value: T; label: string; dot?: string }[];
  value: T;
  onChange: (value: T) => void;
  layoutId: string;
  label: string;
}) {
  const { reduced } = useMotionPreference();

  return (
    // min-w-0 plus wrapping on the pill row: with four options the group is
    // ~305px, wider than the console gets on a phone. Without these it cannot
    // shrink and overflows its panel instead of reflowing.
    <div
      className="flex min-w-0 flex-wrap items-center gap-1.5"
      role="group"
      aria-label={label}
    >
      <span className="text-micro uppercase text-muted/70">{label}</span>
      <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-edge bg-deep/60 p-0.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={`relative flex items-center gap-1.5 rounded px-2 py-1 text-micro font-medium uppercase transition-colors duration-fast ${
                active ? "text-accent" : "text-muted hover:text-ink"
              }`}
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  transition={reduced ? { duration: 0 } : spring.layout}
                  className="absolute inset-0 -z-10 rounded border border-accent/30 bg-accent/10"
                />
              )}
              {option.dot && (
                <span className={`h-1.5 w-1.5 rounded-full ${option.dot}`} aria-hidden />
              )}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FeedFilters({
  status,
  risk,
  feature,
  onStatusChange,
  onRiskChange,
  onClearFeature,
}: {
  status: StatusFilter;
  risk: RiskFilter;
  /** Feature filter is owned by the ROI panel; shown here as a clearable chip. */
  feature: string | null;
  onStatusChange: (value: StatusFilter) => void;
  onRiskChange: (value: RiskFilter) => void;
  onClearFeature: () => void;
}) {
  const { reduced } = useMotionPreference();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-edge px-4 py-2.5">
      <Segmented
        options={STATUS_OPTIONS}
        value={status}
        onChange={onStatusChange}
        layoutId="feed-status-filter"
        label="Status"
      />
      <Segmented
        options={RISK_OPTIONS}
        value={risk}
        onChange={onRiskChange}
        layoutId="feed-risk-filter"
        label="Risk"
      />

      <AnimatePresence initial={false}>
        {feature && (
          <motion.button
            layout={!reduced}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={reduced ? { duration: 0 } : spring.snappy}
            onClick={onClearFeature}
            className="flex items-center gap-2 rounded border border-accent/40 bg-accent/10 px-2 py-1 text-micro text-accent transition-colors duration-fast hover:bg-accent/20"
          >
            {feature}
            <span aria-hidden>×</span>
            <span className="sr-only">Clear feature filter</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
