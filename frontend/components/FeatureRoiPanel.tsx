"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { FeatureRoiChart, type Metric, type RoiRow } from "@/components/charts/FeatureRoiChart";
import { MARK } from "@/components/charts/palette";
import { RiskDistribution } from "@/components/charts/RiskDistribution";
import { SkeletonChart } from "@/components/ui/Skeleton";
import { duration, spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";
import type { DowngradeSuggestion, FeatureROI, RiskScore } from "@/lib/api";

type View = "chart" | "table";

/**
 * Segmented toggle with a sliding selection, matching the feed's filter chips.
 */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  layoutId,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  layoutId: string;
}) {
  const { reduced } = useMotionPreference();
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-edge bg-deep/60 p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={`relative rounded px-2 py-1 text-micro font-medium uppercase transition-colors duration-fast ${
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
            {option.label}
          </button>
        );
      })}
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
  const { reduced } = useMotionPreference();
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative h-4 w-8 shrink-0 rounded-full transition-colors duration-fast ${
        enabled ? "bg-accent/70" : "bg-edge"
      }`}
    >
      <motion.span
        className="absolute top-0.5 h-3 w-3 rounded-full bg-panel"
        animate={{ left: enabled ? "1.125rem" : "0.125rem" }}
        transition={reduced ? { duration: 0 } : spring.snappy}
      />
      <span className="sr-only">Toggle auto-downgrade</span>
    </button>
  );
}

/** The chart's accessible twin — every plotted value as text. */
function RoiTable({ rows, metric }: { rows: RoiRow[]; metric: Metric }) {
  return (
    <table className="w-full text-left text-meta">
      <thead className="text-micro uppercase text-muted">
        <tr className="border-b border-edge">
          <th className="py-1.5 font-medium">Feature</th>
          <th className="py-1.5 text-right font-medium">
            {metric === "cost" ? "Cost" : "Tokens"}
          </th>
          <th className="py-1.5 text-right font-medium">Actions</th>
          <th className="py-1.5 text-right font-medium">ROI</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.feature_tag} className="border-b border-edge/40 last:border-0">
            <td className="py-1.5">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-ink">{row.feature_tag}</span>
                {row.flagged && (
                  <span className="shrink-0 text-micro uppercase" style={{ color: "#C4B5FD" }}>
                    downgrade
                  </span>
                )}
              </span>
            </td>
            <td className="py-1.5 text-right tabular-nums text-muted">
              {metric === "cost" ? `$${row.cost.toFixed(5)}` : row.tokens.toLocaleString()}
            </td>
            <td className="py-1.5 text-right tabular-nums text-muted">{row.action_count}</td>
            <td className="py-1.5 text-right tabular-nums text-muted">
              {row.roi_score === null ? "—" : row.roi_score.toFixed(1)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FeatureRoiPanel({
  features,
  suggestions,
  autoDowngrade,
  activeFeature,
  riskCounts,
  loading,
  onSelectFeature,
  onToggleAutoDowngrade,
}: {
  features: FeatureROI[];
  suggestions: Record<string, DowngradeSuggestion>;
  autoDowngrade: Record<string, boolean>;
  activeFeature: string | null;
  riskCounts: Record<RiskScore, number> | null;
  loading: boolean;
  onSelectFeature: (tag: string) => void;
  onToggleAutoDowngrade: (tag: string, enabled: boolean) => void;
}) {
  const [metric, setMetric] = useState<Metric>("cost");
  const [view, setView] = useState<View>("chart");

  const rows: RoiRow[] = features.map((f) => ({
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
    <section className="flex min-h-0 flex-col rounded-xl border border-edge bg-panel shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3">
        <h2 className="font-display text-data font-semibold uppercase tracking-[0.12em] text-ink">
          Feature ROI
        </h2>
        <div className="flex items-center gap-2">
          <Segmented
            options={[
              { value: "cost" as const, label: "Cost" },
              { value: "tokens" as const, label: "Tokens" },
            ]}
            value={metric}
            onChange={setMetric}
            layoutId="roi-metric"
          />
          <Segmented
            options={[
              { value: "chart" as const, label: "Chart" },
              { value: "table" as const, label: "Table" },
            ]}
            value={view}
            onChange={setView}
            layoutId="roi-view"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <SkeletonChart />
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-data text-muted">No features to rank yet.</p>
        ) : (
          <>
            {riskCounts && (
              <div className="mb-4 border-b border-edge pb-4">
                <h3 className="mb-2 text-micro uppercase text-muted">Risk distribution</h3>
                <RiskDistribution
                  counts={riskCounts}
                  scopeLabel={activeFeature ? activeFeature : "all actions"}
                />
              </div>
            )}

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: duration.fast }}
              >
                {view === "chart" ? (
                  <FeatureRoiChart
                    rows={rows}
                    metric={metric}
                    activeFeature={activeFeature}
                    onSelectFeature={onSelectFeature}
                  />
                ) : (
                  <RoiTable rows={rows} metric={metric} />
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-4 text-micro text-muted">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ backgroundColor: MARK.spend }}
                    aria-hidden
                  />
                  spend
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ backgroundColor: MARK.flagged }}
                    aria-hidden
                  />
                  flagged for downgrade
                </span>
              </div>
              <p className="text-micro text-muted/70">Click a feature to filter the feed.</p>
            </div>

            <div className="mt-4 space-y-1.5 border-t border-edge pt-4">
              <h3 className="text-micro uppercase text-muted">Auto-downgrade</h3>
              <p className="text-micro leading-snug text-muted">
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
                    <span className="flex items-center gap-2 truncate text-data text-ink">
                      {row.feature_tag}
                      {enabled && (
                        <span className="rounded border border-accent/40 bg-accent/10 px-1 py-px text-micro uppercase text-accent">
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

            <AnimatePresence initial={false}>
              {flagged.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-2 overflow-hidden border-t border-edge pt-4"
                >
                  <h3 className="text-micro uppercase text-muted">Downgrade suggested</h3>
                  {flagged.map((row) => (
                    <motion.button
                      key={row.feature_tag}
                      layout
                      whileHover={{ x: 2 }}
                      onClick={() => onSelectFeature(row.feature_tag)}
                      className="block w-full rounded-md border-l-2 px-3 py-2 text-left transition-colors duration-fast"
                      style={{
                        borderColor: `${MARK.flagged}99`,
                        backgroundColor: `${MARK.flagged}0D`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-data font-medium text-ink">
                          {row.feature_tag}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 text-micro uppercase text-muted">
                          <span
                            className="h-2 w-2 rounded-sm"
                            style={{ backgroundColor: MARK.flagged }}
                            aria-hidden
                          />
                          → {row.suggestion?.suggested_model}
                        </span>
                      </div>
                      <p className="mt-1 text-meta leading-snug text-muted">
                        {row.suggestion?.reason}
                      </p>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </section>
  );
}
