import type { AgentAction, FeatureROI, RiskScore, Summary } from "@/lib/api";

/**
 * Demo Mode — a scripted burst for showing the UI without live traffic.
 *
 * Two rules this file exists to honour:
 *
 *  1. The shapes are the REAL ones. Every record below is a genuine
 *     `AgentAction` from lib/api, so demo data flows through exactly the same
 *     components, formatters and animations as backend data. Nothing renders a
 *     special "demo" branch, which is what makes the demo representative.
 *
 *  2. It is never mistakable for real data. IDs are negative — the backend's
 *     are positive autoincrements, so a demo row can never collide with or be
 *     confused for a real one — and the UI shows a persistent banner while the
 *     mode is on.
 *
 * The factor scores, risk labels and outcomes below are copied from an actual
 * run of backend/simulate_support_bot.py against the live Groq scorer, so the
 * demo shows what the system genuinely produces rather than idealised numbers.
 */

type Script = {
  action_type: string;
  action_payload: Record<string, unknown>;
  risk_score: RiskScore;
  risk_reason: string;
  data_sensitivity: number;
  external_exposure: number;
  reversibility: number;
  factor_reasoning: Record<string, string>;
  feature_tag: string;
  tokens_used: number;
  estimated_cost_usd: number;
  status: AgentAction["status"];
  /** Delay before this action appears, ms after the previous one. */
  gapMs: number;
};

const AGENT = "support-copilot";
const MODEL = "llama-3.3-70b-versatile";

const SCRIPT: Script[] = [
  {
    action_type: "search_knowledge_base",
    action_payload: { query: "refund policy annual plan", top_k: 5 },
    risk_score: "low",
    risk_reason:
      "Composite 0.0/10 -> low; read-only lookup against public help content with no customer data involved.",
    data_sensitivity: 0,
    external_exposure: 0,
    reversibility: 0,
    factor_reasoning: {
      data_sensitivity: "Queries public help-centre articles only.",
      external_exposure: "Stays entirely inside the support tool.",
      reversibility: "A read has nothing to undo.",
    },
    feature_tag: "support_ticketing",
    tokens_used: 412,
    estimated_cost_usd: 0.00027,
    status: "executed",
    gapMs: 700,
  },
  {
    action_type: "reply_to_ticket",
    action_payload: {
      ticket_id: "TK-4471",
      body: "Happy to help — your annual plan is eligible for a prorated refund.",
    },
    risk_score: "low",
    risk_reason:
      "Composite 3.0/10 -> low; customer-visible reply but confined to an existing ticket thread.",
    data_sensitivity: 5,
    external_exposure: 0,
    reversibility: 5,
    factor_reasoning: {
      data_sensitivity: "References the customer's plan but no payment details.",
      external_exposure: "Posted to the ticket, not to an external channel.",
      reversibility: "A reply can be edited or followed up.",
    },
    feature_tag: "support_ticketing",
    tokens_used: 638,
    estimated_cost_usd: 0.00042,
    status: "executed",
    gapMs: 1500,
  },
  {
    action_type: "access_customer_profile",
    action_payload: { customer_id: "cus_8812", fields: ["plan", "billing_status"] },
    risk_score: "medium",
    risk_reason:
      "Composite 3.5/10 -> medium; reads an identified customer record, though it stays internal.",
    data_sensitivity: 10,
    external_exposure: 0,
    reversibility: 0,
    factor_reasoning: {
      data_sensitivity: "Reads a specific customer's account record.",
      external_exposure: "Internal read, nothing leaves the system.",
      reversibility: "A read has nothing to undo.",
    },
    feature_tag: "customer_data",
    tokens_used: 521,
    estimated_cost_usd: 0.00034,
    status: "executed",
    gapMs: 1600,
  },
  {
    action_type: "issue_refund",
    action_payload: { customer_id: "cus_8812", amount_usd: 149.0, reason: "prorated annual" },
    risk_score: "high",
    risk_reason:
      "Composite 7.5/10 -> high; moves real money out and is not cleanly reversible.",
    data_sensitivity: 10,
    external_exposure: 5,
    reversibility: 8,
    factor_reasoning: {
      data_sensitivity: "Touches payment records for an identified customer.",
      external_exposure: "Hits the payment processor outside our boundary.",
      reversibility: "Reversing a refund needs a new charge and consent.",
    },
    feature_tag: "billing_notifications",
    tokens_used: 744,
    estimated_cost_usd: 0.00049,
    status: "pending_approval",
    gapMs: 1800,
  },
  {
    action_type: "send_password_reset_link",
    action_payload: { customer_id: "cus_8812", channel: "email" },
    risk_score: "high",
    risk_reason:
      "Composite 8.0/10 -> high; sends an account-recovery credential to an external address.",
    data_sensitivity: 10,
    external_exposure: 10,
    reversibility: 5,
    factor_reasoning: {
      data_sensitivity: "Involves account credentials and identity.",
      external_exposure: "Delivers a reset link to an external mailbox.",
      reversibility: "The link can be revoked, but not unsent.",
    },
    feature_tag: "email_campaign",
    tokens_used: 689,
    estimated_cost_usd: 0.00045,
    status: "pending_approval",
    gapMs: 1700,
  },
  {
    action_type: "cancel_subscription",
    action_payload: { customer_id: "cus_8812", plan: "annual_pro", immediate: true },
    risk_score: "medium",
    risk_reason:
      "Composite 5.6/10 -> medium; irreversible for the customer, but stays inside our systems.",
    data_sensitivity: 8,
    external_exposure: 2,
    reversibility: 8,
    factor_reasoning: {
      data_sensitivity: "Alters the customer's subscription record.",
      external_exposure: "Internal state change with a downstream email.",
      reversibility: "Re-subscribing is a new contract, not an undo.",
    },
    feature_tag: "billing_notifications",
    tokens_used: 702,
    estimated_cost_usd: 0.00046,
    status: "blocked",
    gapMs: 1900,
  },
];

export const DEMO_STEP_COUNT = SCRIPT.length;

/** Total wall-clock length of one full replay, for the UI's progress copy. */
export const DEMO_DURATION_MS = SCRIPT.reduce((total, s) => total + s.gapMs, 0);

/**
 * Builds the nth demo action. IDs are negative and descend, so the feed's
 * newest-first ordering and its numeric keys both behave exactly as they do
 * with real data.
 */
export function demoActionAt(index: number, now = Date.now()): AgentAction {
  const script = SCRIPT[index];
  return {
    id: -(index + 1),
    timestamp: new Date(now).toISOString(),
    agent_name: AGENT,
    action_type: script.action_type,
    action_payload: script.action_payload,
    risk_score: script.risk_score,
    risk_reason: script.risk_reason,
    data_sensitivity: script.data_sensitivity,
    external_exposure: script.external_exposure,
    reversibility: script.reversibility,
    factor_reasoning: script.factor_reasoning,
    feature_tag: script.feature_tag,
    model_used: MODEL,
    downgraded: false,
    tokens_used: script.tokens_used,
    estimated_cost_usd: script.estimated_cost_usd,
    status: script.status,
    outcome: null,
  };
}

export function demoGapAt(index: number): number {
  return SCRIPT[index].gapMs;
}

/** Summary derived from whatever slice of the script has played so far. */
export function demoSummary(actions: AgentAction[]): Summary {
  const blocked = actions.filter((a) => a.status === "blocked").length;
  const cost = actions.reduce((total, a) => total + a.estimated_cost_usd, 0);
  return {
    total_actions_today: actions.length,
    blocked_today: blocked,
    blocked_pct_today: actions.length === 0 ? 0 : (blocked / actions.length) * 100,
    total_cost_usd_today: cost,
    total_cost_usd_all_time: cost,
  };
}

export function demoRiskCounts(actions: AgentAction[]): Record<RiskScore, number> {
  return {
    low: actions.filter((a) => a.risk_score === "low").length,
    medium: actions.filter((a) => a.risk_score === "medium").length,
    high: actions.filter((a) => a.risk_score === "high").length,
  };
}

/** Per-feature aggregates, matching what /api/features/roi would return. */
export function demoFeatureRoi(actions: AgentAction[]): FeatureROI[] {
  const byTag = new Map<string, AgentAction[]>();
  for (const action of actions) {
    const list = byTag.get(action.feature_tag) ?? [];
    list.push(action);
    byTag.set(action.feature_tag, list);
  }

  return Array.from(byTag.entries())
    .map(([feature_tag, group]) => ({
      feature_tag,
      action_count: group.length,
      blocked_count: group.filter((a) => a.status === "blocked").length,
      total_tokens: group.reduce((t, a) => t + a.tokens_used, 0),
      total_cost_usd: group.reduce((t, a) => t + a.estimated_cost_usd, 0),
      judged_actions: 0,
      valuable_actions: 0,
      value_rate: null,
      outcome_value_usd: 0,
      total_outcome_value_usd: 0,
      roi_score: null,
    }))
    .sort((a, b) => b.total_cost_usd - a.total_cost_usd);
}
