import type { Summary } from "@/lib/api";

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-muted">{label}</span>
      <span
        className={`font-display text-2xl font-semibold tabular-nums ${
          tone === "warn" ? "text-risk-high" : "text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function TopBar({
  summary,
  live,
}: {
  summary: Summary | null;
  live: boolean;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-6 border-b border-edge bg-panel px-6 py-4">
      <div className="flex items-baseline gap-3">
        <h1 className="font-display text-lg font-bold tracking-tight text-ink">
          SENTINEL
        </h1>
        <span className="text-[11px] text-muted">agent governance &amp; ROI</span>
      </div>

      <div className="flex items-center gap-10">
        <Stat
          label="Actions today"
          value={summary ? String(summary.total_actions_today) : "—"}
        />
        <Stat
          label="Blocked"
          value={summary ? `${summary.blocked_pct_today}%` : "—"}
          tone={summary && summary.blocked_pct_today > 0 ? "warn" : "default"}
        />
        <Stat
          label="Est. cost today"
          value={summary ? `$${summary.total_cost_usd_today.toFixed(4)}` : "—"}
        />

        <div className="flex items-center gap-2 border-l border-edge pl-6">
          <span
            className={`h-2 w-2 rounded-full ${
              live ? "animate-pulse bg-accent" : "bg-muted"
            }`}
          />
          <span className="text-[10px] uppercase tracking-widest text-muted">
            {live ? "Live" : "Offline"}
          </span>
        </div>
      </div>
    </header>
  );
}
