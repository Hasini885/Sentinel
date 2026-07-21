"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { DowngradeAdvisories } from "@/components/analytics/DowngradeAdvisories";
import {
  FeatureRoiChart,
  type Metric,
  type RoiRow,
} from "@/components/charts/FeatureRoiChart";
import { MARK } from "@/components/charts/palette";
import { RiskDistribution } from "@/components/charts/RiskDistribution";
import { useSentinelData } from "@/components/data/SentinelDataProvider";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { SkeletonChart } from "@/components/ui/Skeleton";
import { duration, rise, spring, stagger } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";
import { API_BASE } from "@/lib/api";

type View = "chart" | "table";

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
            className={`relative rounded px-2.5 py-1 text-micro font-medium uppercase transition-colors duration-fast ${
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

/** The chart's accessible twin — every plotted value as text. */
function RoiTable({ rows, metric }: { rows: RoiRow[]; metric: Metric }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-meta">
        <thead className="text-micro uppercase text-muted">
          <tr className="border-b border-edge">
            <th className="py-2 font-medium">Feature</th>
            <th className="py-2 text-right font-medium">
              {metric === "cost" ? "Cost" : "Tokens"}
            </th>
            <th className="py-2 text-right font-medium">Actions</th>
            <th className="py-2 text-right font-medium">Blocked</th>
            <th className="py-2 text-right font-medium">ROI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.feature_tag} className="border-b border-edge/40 last:border-0">
              <td className="py-2">
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-mono text-ink">{row.feature_tag}</span>
                  {row.flagged && (
                    <span
                      className="shrink-0 text-micro uppercase"
                      style={{ color: "#C4B5FD" }}
                    >
                      downgrade
                    </span>
                  )}
                </span>
              </td>
              <td className="py-2 text-right tabular-nums text-muted">
                {metric === "cost"
                  ? `$${row.cost.toFixed(5)}`
                  : row.tokens.toLocaleString()}
              </td>
              <td className="py-2 text-right tabular-nums text-muted">
                {row.action_count}
              </td>
              <td className="py-2 text-right tabular-nums text-muted">
                {row.blocked_count}
              </td>
              <td className="py-2 text-right tabular-nums text-muted">
                {row.roi_score === null ? "—" : row.roi_score.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Cost and ROI analysis.
 *
 * Read-only by design: everything here describes what happened, and the one
 * control that changes behaviour (auto-downgrade) lives in Settings. Mixing
 * "what is true" with "what to do about it" on one page makes it easy to
 * change routing while you thought you were only looking.
 */
export default function AnalyticsPage() {
  const {
    features,
    suggestions,
    riskCounts,
    activeFeature,
    setFeature,
    loading,
    unreachable,
    refresh,
  } = useSentinelData();
  const router = useRouter();

  const [metric, setMetric] = useState<Metric>("cost");
  const [view, setView] = useState<View>("chart");

  const rows: RoiRow[] = features.map((f) => ({
    feature_tag: f.feature_tag,
    cost: f.total_cost_usd,
    tokens: f.total_tokens,
    blocked_count: f.blocked_count,
    flagged: suggestions[f.feature_tag]?.suggest_downgrade ?? false,
    suggestion: suggestions[f.feature_tag],
    roi_score: f.roi_score,
    action_count: f.action_count,
  }));

  /** Filter the shared feed to this feature, then hand off to /actions. */
  const drillDown = (tag: string) => {
    setFeature(tag);
    router.push("/actions");
  };

  if (unreachable) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-xl border border-edge bg-panel/80">
          <ErrorState
            title="Can't reach the Sentinel API"
            body={
              <>
                No ROI data has loaded from <code className="text-ink">{API_BASE}</code>.
                Start the backend and retry.
              </>
            }
            onRetry={refresh}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex w-full flex-col gap-4 p-4 sm:p-6"
      >
        <motion.section
          variants={rise}
          className="rounded-xl border border-edge bg-panel/80 p-5 shadow-panel"
        >
          <h2 className="mb-3 font-display text-data font-semibold uppercase tracking-[0.12em] text-ink">
            Risk distribution
          </h2>
          {riskCounts ? (
            <RiskDistribution
              counts={riskCounts}
              scopeLabel={activeFeature ?? "all actions"}
            />
          ) : (
            <div className="shimmer h-8 w-full rounded" aria-hidden />
          )}
        </motion.section>

        <motion.section
          variants={rise}
          className="flex flex-col rounded-xl border border-edge bg-panel/80 shadow-panel"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-5 py-3.5">
            <h2 className="font-display text-data font-semibold uppercase tracking-[0.12em] text-ink">
              Cost per feature
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

          <div className="p-5">
            {loading ? (
              <SkeletonChart />
            ) : rows.length === 0 ? (
              <EmptyState
                title="No features to rank yet"
                body="Feature ROI appears once agents have run actions that can be attributed to a feature."
              />
            ) : (
              <>
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
                        onSelectFeature={drillDown}
                      />
                    ) : (
                      <RoiTable rows={rows} metric={metric} />
                    )}
                  </motion.div>
                </AnimatePresence>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-edge pt-3">
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
                  <p className="font-sans text-micro text-muted/70">
                    Click a feature to inspect its actions.
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.section>

        <motion.section
          variants={rise}
          className="rounded-xl border border-edge bg-panel/80 p-5 shadow-panel"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-data font-semibold uppercase tracking-[0.12em] text-ink">
              Downgrade suggestions
            </h2>
            <span className="font-sans text-micro text-muted/70">
              Turn auto-downgrade on in Settings
            </span>
          </div>
          {loading ? (
            <SkeletonChart />
          ) : (
            <DowngradeAdvisories
              features={features}
              suggestions={suggestions}
              onDrillDown={drillDown}
            />
          )}
        </motion.section>
      </motion.div>
    </div>
  );
}
