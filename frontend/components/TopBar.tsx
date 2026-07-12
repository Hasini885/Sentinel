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
  lastUpdated,
  onOpenPolicies,
}: {
  summary: Summary | null;
  live: boolean;
  lastUpdated: Date | null;
  onOpenPolicies: () => void;
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

        <div className="flex items-center gap-4 border-l border-edge pl-6">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  live ? "animate-pulse bg-accent" : "bg-risk-high"
                }`}
              />
              <span className="text-[10px] uppercase tracking-widest text-muted">
                {live ? "Live" : "Stale"}
              </span>
            </div>
            {lastUpdated && (
              <span className="text-[10px] tabular-nums text-muted/70">
                {lastUpdated.toLocaleTimeString([], { hour12: false })}
              </span>
            )}
          </div>
          <button
            onClick={onOpenPolicies}
            className="rounded border border-edge px-3 py-1.5 text-[11px] text-muted transition hover:border-accent/50 hover:text-accent"
          >
            Policies
          </button>
        </div>
      </div>
    </header>
  );
}
