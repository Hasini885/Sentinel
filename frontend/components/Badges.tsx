import type { ActionStatus, RiskScore } from "@/lib/api";

const RISK_STYLES: Record<RiskScore, string> = {
  low: "border-risk-low/40 bg-risk-low/10 text-risk-low",
  medium: "border-risk-medium/40 bg-risk-medium/10 text-risk-medium",
  high: "border-risk-high/40 bg-risk-high/10 text-risk-high",
};

export function RiskBadge({ risk }: { risk: RiskScore }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${RISK_STYLES[risk]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {risk}
    </span>
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

export function StatusLabel({ status }: { status: ActionStatus }) {
  return (
    <span
      className={`mt-1 inline-flex items-center gap-1.5 rounded border px-1.5 py-px text-[10px] font-medium ${STATUS_STYLES[status]}`}
    >
      <span className="h-1 w-1 rounded-full bg-current" aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}
