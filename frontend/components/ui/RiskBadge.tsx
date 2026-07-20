"use client";

import { motion } from "framer-motion";

import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";
import type { ActionStatus, RiskScore } from "@/lib/api";

const RISK_STYLES: Record<RiskScore, string> = {
  low: "border-risk-low/40 bg-risk-low/10 text-risk-low",
  medium: "border-risk-medium/40 bg-risk-medium/10 text-risk-medium",
  high: "border-risk-high/40 bg-risk-high/10 text-risk-high",
};

export type RiskBadgeProps = {
  risk: RiskScore;
  /**
   * Pulse the dot on high risk to draw the eye. On by default; turn it off in
   * dense lists where a screenful of pulsing dots becomes noise rather than
   * signal.
   * @default true
   */
  pulse?: boolean;
  className?: string;
};

/**
 * Risk severity pill. Only high risk animates — if everything pulses, nothing
 * reads as urgent, so the motion itself carries the severity distinction.
 */
export function RiskBadge({ risk, pulse = true, className = "" }: RiskBadgeProps) {
  const { reduced } = useMotionPreference();
  const shouldPulse = pulse && risk === "high" && !reduced;

  return (
    <motion.span
      // Springing in on mount means a row whose risk changes visibly re-lands.
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={spring.snappy}
      className={`inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-micro font-bold uppercase ${RISK_STYLES[risk]} ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5" aria-hidden>
        {shouldPulse && (
          <motion.span
            className="absolute inline-flex h-full w-full rounded-full bg-current"
            animate={{ scale: [1, 2.4, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {risk}
    </motion.span>
  );
}

const STATUS_LABELS: Record<ActionStatus, string> = {
  executed: "Executed",
  blocked: "Blocked",
  pending_approval: "Pending approval",
};

const STATUS_STYLES: Record<ActionStatus, string> = {
  executed: "border-edge bg-raised/80 text-muted",
  blocked: "border-risk-high/40 bg-risk-high/10 text-risk-high",
  pending_approval: "border-risk-medium/40 bg-risk-medium/10 text-risk-medium",
};

/** Lifecycle state of an action: executed, blocked, or held for a human. */
export function StatusLabel({ status }: { status: ActionStatus }) {
  return (
    <span
      className={`mt-1 inline-flex items-center gap-1.5 rounded border px-1.5 py-px text-micro font-medium tracking-normal ${STATUS_STYLES[status]}`}
    >
      <span className="h-1 w-1 rounded-full bg-current" aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}
