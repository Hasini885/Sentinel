import type { AgentAction } from "@/lib/api";

/**
 * Display-side mirror of the backend's composite risk formula.
 *
 * These weights MUST match backend/app/risk_scorer.py (WEIGHT_*, *_THRESHOLD).
 * They are duplicated here so an expanded row can show its composite without a
 * per-row round trip to /api/actions/{id}/audit — the list payload already
 * carries the three sub-scores, so the only thing missing is the arithmetic.
 *
 * The backend remains the authority: it is what actually labels an action, and
 * the row displays `action.risk_score` from the server rather than re-deriving
 * the label here. This is presentation only.
 */
export const FACTOR_WEIGHTS = {
  data_sensitivity: 0.35,
  external_exposure: 0.4,
  reversibility: 0.25,
} as const;

export type FactorKey = keyof typeof FACTOR_WEIGHTS;

export const FACTOR_LABELS: Record<FactorKey, string> = {
  data_sensitivity: "Data sensitivity",
  external_exposure: "External exposure",
  reversibility: "Reversibility",
};

export type Factor = {
  key: FactorKey;
  label: string;
  /** 0–10 sub-score from the model. */
  score: number;
  weight: number;
  /** The model's one-line justification, when it supplied one. */
  reason?: string;
};

/**
 * Pulls the three sub-scores off an action, or returns null when the action
 * predates multi-factor scoring (older rows have null factors).
 */
export function factorsOf(action: AgentAction): Factor[] | null {
  const { data_sensitivity, external_exposure, reversibility } = action;
  if (data_sensitivity === null || external_exposure === null || reversibility === null) {
    return null;
  }
  const reasoning = action.factor_reasoning ?? {};
  const scores: Record<FactorKey, number> = {
    data_sensitivity,
    external_exposure,
    reversibility,
  };
  return (Object.keys(FACTOR_WEIGHTS) as FactorKey[]).map((key) => ({
    key,
    label: FACTOR_LABELS[key],
    score: scores[key],
    weight: FACTOR_WEIGHTS[key],
    reason: reasoning[key],
  }));
}

/** Weighted average of the sub-scores, still on a 0–10 scale. */
export function compositeOf(factors: Factor[]): number {
  return factors.reduce((total, f) => total + f.score * f.weight, 0);
}

/** Colour ramp for a 0–10 sub-score. Matches the risk badge thresholds. */
export function toneForScore(score: number): string {
  if (score >= 7) return "bg-risk-high";
  if (score >= 4) return "bg-risk-medium";
  return "bg-risk-low";
}
