"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";

/**
 * The hero's animated visual: a miniature of the real product.
 *
 * Rather than an abstract graphic, this replays the actual thing Sentinel does
 * — actions arriving, each scored and given a verdict. The action names, risk
 * levels and verdicts are the ones the real scorer produces for these payloads,
 * so the hero is a faithful preview rather than a mockup.
 *
 * The card height is fixed and rows are absolutely stacked from the top, so a
 * row arriving never resizes the hero or shifts the page.
 */

type Verdict = "executed" | "held" | "blocked";
type Risk = "low" | "medium" | "high";

type Row = {
  action: string;
  risk: Risk;
  verdict: Verdict;
  cost: string;
};

const ROWS: Row[] = [
  { action: "search_knowledge_base", risk: "low", verdict: "executed", cost: "0.00027" },
  { action: "reply_to_ticket", risk: "low", verdict: "executed", cost: "0.00042" },
  { action: "access_customer_profile", risk: "medium", verdict: "executed", cost: "0.00034" },
  { action: "issue_refund", risk: "high", verdict: "held", cost: "0.00049" },
  { action: "send_password_reset_link", risk: "high", verdict: "held", cost: "0.00045" },
  { action: "cancel_subscription", risk: "medium", verdict: "blocked", cost: "0.00046" },
  { action: "export_user_table", risk: "high", verdict: "blocked", cost: "0.00051" },
];

const RISK_STYLES: Record<Risk, string> = {
  low: "border-risk-low/40 bg-risk-low/10 text-risk-low",
  medium: "border-risk-medium/40 bg-risk-medium/10 text-risk-medium",
  high: "border-risk-high/40 bg-risk-high/10 text-risk-high",
};

const VERDICT_STYLES: Record<Verdict, string> = {
  executed: "text-muted",
  held: "text-risk-medium",
  blocked: "text-risk-high",
};

const VERDICT_LABEL: Record<Verdict, string> = {
  executed: "executed",
  held: "held",
  blocked: "blocked",
};

const VISIBLE = 4;
const TICK_MS = 1900;

export function HeroVisual() {
  const { reduced } = useMotionPreference();
  // Start with a full card so the hero never renders empty on first paint.
  const [cursor, setCursor] = useState(VISIBLE);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (reduced) return;

    const start = () => {
      timer.current = setInterval(() => setCursor((c) => c + 1), TICK_MS);
    };
    const stop = () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };

    // Pause when the tab is hidden — an off-screen interval is wasted work and
    // keeps the main thread busy for nothing.
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    if (!document.hidden) start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced]);

  // A rolling window over an endlessly repeating script.
  const visible = Array.from({ length: VISIBLE }, (_, i) => {
    const index = (cursor - 1 - i) % ROWS.length;
    return {
      ...ROWS[(index + ROWS.length) % ROWS.length],
      key: cursor - 1 - i,
    };
  });

  const blocked = visible.filter((r) => r.verdict !== "executed").length;

  return (
    <div className="relative">
      {/* Ambient glow behind the card — pure decoration, so it is the first
          thing to go when motion is reduced. */}
      {!reduced && (
        <motion.div
          aria-hidden
          className="absolute -inset-8 -z-10 rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, rgb(34 211 238 / 0.28), transparent 65%)",
          }}
          animate={{ opacity: [0.25, 0.45, 0.25], scale: [0.96, 1.04, 0.96] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div className="overflow-hidden rounded-xl border border-edge bg-panel/90 shadow-raised backdrop-blur-sm">
        <div className="edge-sheen relative flex items-center justify-between border-b border-edge px-4 py-2.5">
          <span className="font-display text-micro uppercase tracking-[0.14em] text-ink">
            Live action feed
          </span>
          <span className="flex items-center gap-1.5 text-micro uppercase text-risk-low">
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              {!reduced && (
                <motion.span
                  className="absolute inline-flex h-full w-full rounded-full bg-risk-low"
                  animate={{ scale: [1, 2.6, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-risk-low" />
            </span>
            live
          </span>
        </div>

        {/* Fixed height + absolutely positioned rows: arrivals never resize the
            card, so the hero contributes zero layout shift. */}
        <div className="relative h-[13.5rem] sm:h-[14.5rem]">
          <AnimatePresence initial={false}>
            {visible.map((row, i) => (
              <motion.div
                key={row.key}
                initial={reduced ? false : { opacity: 0, y: -14 }}
                animate={{ opacity: 1 - i * 0.18, y: i * 54 }}
                exit={reduced ? undefined : { opacity: 0, y: VISIBLE * 54 }}
                transition={reduced ? { duration: 0 } : spring.soft}
                className="absolute inset-x-0 top-0 px-4 py-2.5"
              >
                <div className="flex items-center justify-between gap-2 border-b border-edge/40 pb-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 text-micro font-bold uppercase ${RISK_STYLES[row.risk]}`}
                    >
                      {row.risk}
                    </span>
                    <span className="truncate font-mono text-data text-ink">
                      {row.action}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden font-mono text-micro tabular-nums text-muted/70 sm:inline">
                      ${row.cost}
                    </span>
                    <span
                      className={`font-mono text-micro uppercase ${VERDICT_STYLES[row.verdict]}`}
                    >
                      {VERDICT_LABEL[row.verdict]}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-edge bg-deep/40 px-4 py-3">
          <Stat label="Scored" value={cursor} format={(n) => Math.round(n).toString()} />
          <Stat
            label="Governed"
            value={blocked}
            format={(n) => Math.round(n).toString()}
            tone="warn"
          />
          <Stat
            label="Spend"
            value={cursor * 0.00042}
            format={(n) => `$${n.toFixed(4)}`}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  format,
  tone = "default",
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-micro uppercase text-muted/70">{label}</span>
      <span
        className={`font-display text-base font-semibold tabular-nums ${
          tone === "warn" ? "text-risk-medium" : "text-ink"
        }`}
      >
        <AnimatedNumber value={value} format={format} />
      </span>
    </div>
  );
}
