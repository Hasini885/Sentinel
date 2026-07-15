"use client";

import { motion } from "framer-motion";

import { AnimatedNumber } from "@/components/AnimatedNumber";
import type { Summary } from "@/lib/api";

function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="flex flex-col gap-0.5 border-l border-edge pl-5 first:border-l-0 first:pl-0">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted">
        <span className="h-2.5 w-px bg-accent/60" aria-hidden />
        {label}
      </span>
      <span
        className={`font-display text-2xl font-semibold leading-tight tabular-nums ${
          tone === "warn" ? "text-risk-high" : "text-ink"
        }`}
      >
        {value}
      </span>
      {hint && <span className="text-[10px] tabular-nums text-muted/70">{hint}</span>}
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
    <header className="relative z-10 flex flex-wrap items-center justify-between gap-6 bg-panel/80 px-6 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="relative h-9 w-9" aria-hidden>
          {/* Slowly rotating conic halo behind the mark. */}
          <motion.span
            className="absolute -inset-1 rounded-xl opacity-60 blur-[6px]"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(34,211,238,0), rgba(34,211,238,0.55), rgba(34,211,238,0))",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-accent/40 bg-gradient-to-br from-accent/20 to-transparent font-display text-base font-bold text-accent"
            animate={{
              boxShadow: [
                "0 0 14px rgba(34,211,238,0.20)",
                "0 0 24px rgba(34,211,238,0.45)",
                "0 0 14px rgba(34,211,238,0.20)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            ◈
          </motion.div>
        </div>
        <div className="flex flex-col">
          <h1 className="font-display text-lg font-bold leading-tight tracking-[0.18em] text-ink">
            SENTINEL
          </h1>
          <span className="text-[10px] uppercase tracking-widest text-muted">
            agent governance &amp; ROI
          </span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <Stat
          label="Actions today"
          value={
            summary ? <AnimatedNumber value={summary.total_actions_today} /> : "—"
          }
        />
        <Stat
          label="Blocked"
          value={
            summary ? (
              <AnimatedNumber
                value={summary.blocked_pct_today}
                format={(n) => `${n.toFixed(1)}%`}
              />
            ) : (
              "—"
            )
          }
          hint={summary ? `${summary.blocked_today} actions` : undefined}
          tone={summary && summary.blocked_pct_today > 0 ? "warn" : "default"}
        />
        <Stat
          label="Est. cost today"
          value={
            summary ? (
              <AnimatedNumber
                value={summary.total_cost_usd_today}
                format={(n) => `$${n.toFixed(4)}`}
              />
            ) : (
              "—"
            )
          }
          hint={
            summary ? `$${summary.total_cost_usd_all_time.toFixed(4)} all time` : undefined
          }
        />

        <div className="flex items-center gap-4 border-l border-edge pl-5">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2" aria-hidden>
                {live && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    live ? "bg-accent" : "bg-risk-high"
                  }`}
                />
              </span>
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
          <motion.button
            onClick={onOpenPolicies}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            className="rounded-md border border-edge bg-raised/60 px-3.5 py-1.5 text-[11px] font-medium text-muted transition hover:border-accent/50 hover:text-accent hover:shadow-[0_0_12px_rgba(34,211,238,0.15)]"
          >
            Policies
          </motion.button>
        </div>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"
        aria-hidden
      />
    </header>
  );
}
