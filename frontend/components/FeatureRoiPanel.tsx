"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DowngradeSuggestion, FeatureROI } from "@/lib/api";
import { SkeletonChart } from "@/components/Skeleton";

// Cyan = spending normally. Violet = advisory. Neither touches the green/amber/red
// reserved for risk severity, so the two signals never get confused.
const BAR = "#22D3EE";
const BAR_FLAGGED = "#A78BFA";

type Metric = "cost" | "tokens";

interface Row {
  feature_tag: string;
  cost: number;
  tokens: number;
  flagged: boolean;
  suggestion?: DowngradeSuggestion;
  roi_score: number | null;
  action_count: number;
}

function ChartTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
  metric: Metric;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="max-w-xs rounded border border-edge bg-raised px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-ink">{row.feature_tag}</p>
      <p className="mt-1 text-muted">
        {metric === "cost"
          ? `$${row.cost.toFixed(5)} across ${row.action_count} actions`
          : `${row.tokens.toLocaleString()} tokens across ${row.action_count} actions`}
      </p>
      {row.roi_score !== null && (
        <p className="text-muted">ROI score {row.roi_score.toFixed(1)}</p>
      )}
      {row.flagged && row.suggestion && (
        <p className="mt-1.5 border-t border-edge pt-1.5 leading-snug text-[#A78BFA]">
          {row.suggestion.reason}
        </p>
      )}
    </div>
  );
}

function AutoDowngradeToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative h-4 w-8 shrink-0 rounded-full transition ${
        enabled ? "bg-accent/70" : "bg-edge"
      }`}
    >
      <span
        className="absolute top-0.5 h-3 w-3 rounded-full bg-panel transition-all"
        style={{ left: enabled ? "1.125rem" : "0.125rem" }}
      />
      <span className="sr-only">Toggle auto-downgrade</span>
    </button>
  );
}

export function FeatureRoiPanel({
  features,
  suggestions,
  autoDowngrade,
  activeFeature,
  loading,
  onSelectFeature,
  onToggleAutoDowngrade,
}: {
  features: FeatureROI[];
  suggestions: Record<string, DowngradeSuggestion>;
  autoDowngrade: Record<string, boolean>;
  activeFeature: string | null;
  loading: boolean;
  onSelectFeature: (tag: string) => void;
  onToggleAutoDowngrade: (tag: string, enabled: boolean) => void;
}) {
  const [metric, setMetric] = useState<Metric>("cost");

  const rows: Row[] = features.map((f) => ({
    feature_tag: f.feature_tag,
    cost: f.total_cost_usd,
    tokens: f.total_tokens,
    flagged: suggestions[f.feature_tag]?.suggest_downgrade ?? false,
    suggestion: suggestions[f.feature_tag],
    roi_score: f.roi_score,
    action_count: f.action_count,
  }));

  const flagged = rows.filter((r) => r.flagged);

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-edge bg-panel">
      <div className="flex items-center justify-between border-b border-edge px-4 py-3">
        <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-ink">
          Feature ROI
        </h2>
        <div className="flex rounded border border-edge">
          {(["cost", "tokens"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-2 py-1 text-[10px] uppercase tracking-widest transition ${
                metric === m ? "bg-accent/15 text-accent" : "text-muted hover:text-ink"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <SkeletonChart />
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted">
            No features to rank yet.
          </p>
        ) : (
          <>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rows}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                >
                  <XAxis
                    type="number"
                    stroke="#7D8894"
                    tick={{ fontSize: 10, fill: "#7D8894" }}
                    tickLine={false}
                    axisLine={{ stroke: "#1F2630" }}
                    tickFormatter={(v: number) =>
                      metric === "cost" ? `$${v.toFixed(3)}` : v.toLocaleString()
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="feature_tag"
                    width={130}
                    stroke="#7D8894"
                    tick={{ fontSize: 10, fill: "#7D8894" }}
                    tickLine={false}
                    axisLine={{ stroke: "#1F2630" }}
                  />
                  <Tooltip
                    cursor={{ fill: "#171C24" }}
                    content={<ChartTooltip metric={metric} />}
                  />
                  <Bar
                    dataKey={metric}
                    radius={[0, 2, 2, 0]}
                    onClick={(row: Row) => onSelectFeature(row.feature_tag)}
                    className="cursor-pointer"
                  >
                    {rows.map((row) => (
                      <Cell
                        key={row.feature_tag}
                        fill={row.flagged ? BAR_FLAGGED : BAR}
                        fillOpacity={
                          activeFeature && activeFeature !== row.feature_tag ? 0.3 : 1
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="mt-3 text-[10px] text-muted">
              Click a bar to filter the feed. Violet bars are flagged for downgrade.
            </p>

            <div className="mt-4 space-y-1.5 border-t border-edge pt-4">
              <h3 className="text-[10px] uppercase tracking-widest text-muted">
                Auto-downgrade
              </h3>
              <p className="text-[10px] leading-snug text-muted">
                When on, actions of a flagged feature are routed to the cheaper model
                automatically.
              </p>
              {rows.map((row) => {
                const enabled = autoDowngrade[row.feature_tag] ?? false;
                return (
                  <div
                    key={row.feature_tag}
                    className="flex items-center justify-between gap-3 py-1"
                  >
                    <span className="flex items-center gap-2 truncate text-xs text-ink">
                      {row.feature_tag}
                      {enabled && (
                        <span className="rounded border border-accent/40 bg-accent/10 px-1 py-px text-[9px] uppercase tracking-widest text-accent">
                          auto
                        </span>
                      )}
                    </span>
                    <AutoDowngradeToggle
                      enabled={enabled}
                      onToggle={() => onToggleAutoDowngrade(row.feature_tag, !enabled)}
                    />
                  </div>
                );
              })}
            </div>

            {flagged.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-edge pt-4">
                <h3 className="text-[10px] uppercase tracking-widest text-muted">
                  Downgrade suggested
                </h3>
                {flagged.map((row) => (
                  <button
                    key={row.feature_tag}
                    onClick={() => onSelectFeature(row.feature_tag)}
                    className="block w-full rounded border border-[#A78BFA]/30 bg-[#A78BFA]/5 px-3 py-2 text-left transition hover:bg-[#A78BFA]/10"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-ink">
                        {row.feature_tag}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-[#A78BFA]">
                        &rarr; {row.suggestion?.suggested_model}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-muted">
                      {row.suggestion?.reason}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
