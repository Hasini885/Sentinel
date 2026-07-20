"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useToast } from "@/components/ui/Toast";
import {
  DEMO_STEP_COUNT,
  demoActionAt,
  demoFeatureRoi,
  demoGapAt,
  demoRiskCounts,
  demoSummary,
} from "@/lib/demo";
import type { AgentAction, FeatureROI, RiskScore, Summary } from "@/lib/api";

export type DemoSlice = {
  actions: AgentAction[];
  pending: AgentAction[];
  summary: Summary;
  features: FeatureROI[];
  riskCounts: Record<RiskScore, number>;
};

/**
 * Replays the scripted burst, emitting one action at a time.
 *
 * The hook owns only demo state — it never touches the real data the page has
 * already fetched, so switching the mode off restores the live dashboard
 * instantly with no refetch.
 *
 * Each arriving action also raises a toast, which is what makes the policy
 * decisions legible in a demo: a blocked action announces itself instead of
 * quietly appearing in a list the audience may not be looking at.
 */
export function useDemoMode(enabled: boolean) {
  const [played, setPlayed] = useState<AgentAction[]>([]);
  const toast = useToast();
  // Held in a ref so the replay effect does not restart when the toast
  // identity changes; the timer chain must not be torn down mid-burst.
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    if (!enabled) {
      setPlayed([]);
      return;
    }

    let index = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const step = () => {
      if (cancelled) return;

      const action = demoActionAt(index);
      setPlayed((current) => [action, ...current]);

      if (action.status === "blocked") {
        toastRef.current.push({
          tone: "danger",
          title: "Action blocked",
          detail: `${action.action_type} breached policy at ${action.risk_score} risk.`,
        });
      } else if (action.status === "pending_approval") {
        toastRef.current.push({
          tone: "warn",
          title: "Approval required",
          detail: `${action.action_type} is held for a human decision.`,
        });
      }

      index += 1;
      if (index >= DEMO_STEP_COUNT) {
        toastRef.current.push({
          tone: "info",
          title: "Demo replay complete",
          detail: `${DEMO_STEP_COUNT} actions streamed through the live pipeline.`,
        });
        return;
      }
      timer = setTimeout(step, demoGapAt(index));
    };

    timer = setTimeout(step, demoGapAt(0));

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);

  const slice: DemoSlice = {
    actions: played,
    pending: played.filter((a) => a.status === "pending_approval"),
    summary: demoSummary(played),
    features: demoFeatureRoi(played),
    riskCounts: demoRiskCounts(played),
  };

  /** Removes an action from the demo pending list, mirroring approve/reject. */
  const decide = useCallback((id: number, decision: "approve" | "reject") => {
    setPlayed((current) =>
      current.map((a) =>
        a.id === id ? { ...a, status: decision === "approve" ? "executed" : "blocked" } : a,
      ),
    );
  }, []);

  return { slice, decide, complete: played.length >= DEMO_STEP_COUNT };
}
