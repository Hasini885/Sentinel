"use client";

import { Fragment, useState } from "react";
import type { AgentAction } from "@/lib/api";
import { RiskBadge, StatusLabel } from "@/components/Badges";
import { SkeletonRows } from "@/components/Skeleton";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function FactorBar({
  label,
  score,
  reason,
}: {
  label: string;
  score: number;
  reason: string | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-36 shrink-0 pt-0.5 text-[10px] uppercase tracking-widest text-muted">
        {label}
      </span>
      <div className="w-32 shrink-0 pt-1">
        <div className="h-1.5 w-full rounded-full bg-edge">
          <div
            className="h-1.5 rounded-full bg-accent"
            style={{ width: `${(score / 10) * 100}%` }}
          />
        </div>
      </div>
      <span className="w-10 shrink-0 text-[11px] tabular-nums text-ink">{score}/10</span>
      <p className="text-[11px] leading-snug text-muted">{reason ?? "—"}</p>
    </div>
  );
}

function FactorBreakdown({ action }: { action: AgentAction }) {
  if (
    action.data_sensitivity === null ||
    action.external_exposure === null ||
    action.reversibility === null
  ) {
    return (
      <p className="text-[11px] text-muted">
        No factor breakdown for this action (scored before multi-factor scoring, or
        scoring failed and defaulted to high).
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <FactorBar
        label="Data sensitivity"
        score={action.data_sensitivity}
        reason={action.factor_reasoning?.data_sensitivity}
      />
      <FactorBar
        label="External exposure"
        score={action.external_exposure}
        reason={action.factor_reasoning?.external_exposure}
      />
      <FactorBar
        label="Reversibility"
        score={action.reversibility}
        reason={action.factor_reasoning?.reversibility}
      />
    </div>
  );
}

export function ActionFeed({
  actions,
  activeFeature,
  loading,
  onClearFilter,
}: {
  actions: AgentAction[];
  activeFeature: string | null;
  loading: boolean;
  onClearFilter: () => void;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-edge bg-panel">
      <div className="flex items-center justify-between border-b border-edge px-4 py-3">
        <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-ink">
          Live Action Feed
        </h2>
        {activeFeature && (
          <button
            onClick={onClearFilter}
            className="flex items-center gap-2 rounded border border-accent/40 bg-accent/10 px-2 py-1 text-[11px] text-accent transition hover:bg-accent/20"
          >
            {activeFeature}
            <span aria-hidden>&times;</span>
            <span className="sr-only">Clear feature filter</span>
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <SkeletonRows rows={8} />
        ) : actions.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-muted">
            No actions logged{activeFeature ? ` for ${activeFeature}` : ""} yet.
            Run <code className="text-accent">python simulate_agent.py</code>.
          </p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-panel text-[10px] uppercase tracking-widest text-muted">
              <tr className="border-b border-edge">
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Risk</th>
                <th className="px-4 py-2 font-medium">Feature</th>
                <th className="px-4 py-2 text-right font-medium">Tokens</th>
                <th className="px-4 py-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <Fragment key={action.id}>
                  <tr
                    onClick={() =>
                      setExpandedId(expandedId === action.id ? null : action.id)
                    }
                    className="cursor-pointer border-b border-edge/50 align-top transition hover:bg-raised"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-muted tabular-nums">
                      {formatTime(action.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{action.action_type}</div>
                      <StatusLabel status={action.status} />
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge risk={action.risk_score} />
                      <p className="mt-1.5 max-w-[22rem] text-[11px] leading-snug text-muted">
                        {action.risk_reason}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-accent">
                      {action.feature_tag}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {action.tokens_used.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">
                      ${action.estimated_cost_usd.toFixed(5)}
                    </td>
                  </tr>
                  {expandedId === action.id && (
                    <tr className="border-b border-edge/50 bg-raised/50">
                      <td colSpan={6} className="px-4 py-3">
                        <FactorBreakdown action={action} />
                        {action.model_used && (
                          <p className="mt-2 text-[10px] text-muted">
                            Scored with <span className="text-ink">{action.model_used}</span>
                            {action.downgraded && (
                              <span className="ml-1.5 rounded border border-accent/40 bg-accent/10 px-1 py-px text-[9px] uppercase tracking-widest text-accent">
                                auto-downgraded
                              </span>
                            )}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
