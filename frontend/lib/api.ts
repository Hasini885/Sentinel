export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type RiskScore = "low" | "medium" | "high";
export type ActionStatus = "executed" | "blocked" | "pending_approval";
export type Outcome = "valuable" | "not_valuable" | "unclear";

export interface AgentAction {
  id: number;
  timestamp: string;
  agent_name: string;
  action_type: string;
  action_payload: Record<string, unknown>;
  risk_score: RiskScore;
  risk_reason: string;
  feature_tag: string;
  tokens_used: number;
  estimated_cost_usd: number;
  status: ActionStatus;
  outcome: Outcome | null;
}

export interface ActionPage {
  total: number;
  limit: number;
  offset: number;
  items: AgentAction[];
}

export interface Summary {
  total_actions_today: number;
  blocked_today: number;
  blocked_pct_today: number;
  total_cost_usd_today: number;
  total_cost_usd_all_time: number;
}

export interface FeatureROI {
  feature_tag: string;
  action_count: number;
  blocked_count: number;
  total_tokens: number;
  total_cost_usd: number;
  judged_actions: number;
  valuable_actions: number;
  value_rate: number | null;
  outcome_value_usd: number;
  total_outcome_value_usd: number;
  roi_score: number | null;
}

export interface DowngradeSuggestion {
  feature_tag: string;
  suggest_downgrade: boolean;
  suggested_model: string | null;
  reason: string;
  total_cost_usd: number;
  cost_percentile: number;
  value_rate: number | null;
  judged_actions: number;
  valuable_actions: number;
  roi_score: number | null;
}

export interface PolicyRule {
  action_type: string;
  risk_threshold: RiskScore;
  on_breach: "block" | "require_approval";
}

/** Pulls the human-readable message out of FastAPI's error body when there is one. */
async function failure(response: Response, method: string, path: string): Promise<Error> {
  let detail = `${response.status} ${response.statusText}`;
  try {
    const body = await response.json();
    if (typeof body.detail === "string") detail = body.detail;
    else if (Array.isArray(body.detail)) {
      detail = body.detail
        .map((e: { loc?: unknown[]; msg?: string }) =>
          `${(e.loc ?? []).slice(1).join(".")}: ${e.msg ?? "invalid"}`,
        )
        .join("; ");
    }
  } catch {
    /* body wasn't JSON — keep the status line */
  }
  return new Error(`${method} ${path} failed — ${detail}`);
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!response.ok) throw await failure(response, "GET", path);
  return response.json() as Promise<T>;
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw await failure(response, method, path);
  return response.json() as Promise<T>;
}

export function approveAction(id: number): Promise<AgentAction> {
  return send<AgentAction>("POST", `/api/actions/${id}/approve`);
}

export function rejectAction(id: number): Promise<AgentAction> {
  return send<AgentAction>("POST", `/api/actions/${id}/reject`);
}

export function fetchPolicies(): Promise<PolicyRule[]> {
  return get<PolicyRule[]>("/api/policies");
}

export function savePolicies(policies: PolicyRule[]): Promise<PolicyRule[]> {
  return send<PolicyRule[]>("PUT", "/api/policies", policies);
}

export function fetchPendingApprovals(): Promise<ActionPage> {
  return get<ActionPage>("/api/actions?status=pending_approval&limit=50");
}

export function fetchSummary(): Promise<Summary> {
  return get<Summary>("/api/summary");
}

export function fetchActions(featureTag: string | null, limit = 50): Promise<ActionPage> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (featureTag) params.set("feature_tag", featureTag);
  return get<ActionPage>(`/api/actions?${params}`);
}

export function fetchFeatureROI(): Promise<FeatureROI[]> {
  return get<FeatureROI[]>("/api/features/roi");
}

/** One call per feature — fine at this scale, and keeps the heuristic living in the backend. */
export async function fetchDowngradeSuggestions(
  tags: string[],
): Promise<Record<string, DowngradeSuggestion>> {
  const entries = await Promise.all(
    tags.map(async (tag) => {
      const suggestion = await get<DowngradeSuggestion>(
        `/api/features/${encodeURIComponent(tag)}/downgrade-suggestion`,
      );
      return [tag, suggestion] as const;
    }),
  );
  return Object.fromEntries(entries);
}
