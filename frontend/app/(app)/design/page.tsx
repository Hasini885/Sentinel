"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import {
  AnimatedNumber,
  Panel,
  RiskBadge,
  Skeleton,
  SkeletonChart,
  SkeletonRows,
  SkeletonStat,
  StatusLabel,
  duration,
  ease,
  spring,
  stagger,
  useMotionPreference,
} from "@/components/ui";

/**
 * Living documentation for the design system. Every primitive is rendered here
 * with its real props so motion tweaks can be judged in isolation, without
 * needing the backend running or waiting for an agent action to arrive.
 */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-edge/50 py-3 last:border-0">
      <span className="w-40 shrink-0 text-meta text-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`h-12 w-full rounded-lg border border-edge ${className}`} />
      <span className="text-micro uppercase text-muted">{name}</span>
    </div>
  );
}

export default function DesignSystemPage() {
  const [counter, setCounter] = useState(1284);
  const [cost, setCost] = useState(0.0342);
  const { reduced } = useMotionPreference();

  const bump = () => {
    setCounter((n) => n + Math.floor(Math.random() * 400) - 120);
    setCost((c) => Math.max(0, c + (Math.random() - 0.4) * 0.02));
  };

  return (
    <div className="h-full overflow-y-auto">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex w-full flex-col gap-4 p-6"
      >
        <Panel
          title="Palette"
          subtitle="Colours resolve to CSS variables — override them to reskin the app"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Swatch name="deep" className="bg-deep" />
            <Swatch name="panel" className="bg-panel" />
            <Swatch name="raised" className="bg-raised" />
            <Swatch name="edge" className="bg-edge" />
            <Swatch name="accent" className="bg-accent" />
            <Swatch name="risk low" className="bg-risk-low" />
            <Swatch name="risk medium" className="bg-risk-medium" />
            <Swatch name="risk high" className="bg-risk-high" />
          </div>
          <p className="mt-4 text-meta leading-relaxed text-muted">
            Green, amber and red are reserved exclusively for risk severity. The cyan
            accent carries all chrome — focus rings, live indicators, links — so colour
            never has to be disambiguated by context.
          </p>
        </Panel>

        <Panel title="Typography" subtitle="Space Grotesk for headings, JetBrains Mono for data">
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-micro uppercase text-muted">hero · display</span>
              <p className="font-display text-hero font-bold text-ink">Governance</p>
            </div>
            <div>
              <span className="text-micro uppercase text-muted">stat · display tabular</span>
              <p className="font-display text-stat font-semibold tabular-nums text-ink">
                $0.0342
              </p>
            </div>
            <div>
              <span className="text-micro uppercase text-muted">data · mono</span>
              <p className="text-data text-ink">send_email · risk 6.8/10 · 1,284 tokens</p>
            </div>
            <div>
              <span className="text-micro uppercase text-muted">micro · label</span>
              <p className="text-micro uppercase text-muted">actions today</p>
            </div>
          </div>
        </Panel>

        <Panel
          title="Motion tokens"
          subtitle="Every animation in the app pulls its timing from components/ui/motion.ts"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-micro uppercase text-muted">Durations (seconds)</h3>
              <ul className="space-y-1 text-meta text-ink">
                {Object.entries(duration).map(([k, v]) => (
                  <li key={k} className="flex justify-between border-b border-edge/40 py-1">
                    <span className="text-muted">{k}</span>
                    <span className="tabular-nums">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-micro uppercase text-muted">Springs</h3>
              <ul className="space-y-1 text-meta text-ink">
                {Object.entries(spring).map(([k, v]) => (
                  <li key={k} className="flex justify-between border-b border-edge/40 py-1">
                    <span className="text-muted">{k}</span>
                    <span className="tabular-nums">
                      s{(v as { stiffness: number }).stiffness} · d
                      {(v as { damping: number }).damping}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="mb-2 text-micro uppercase text-muted">Easing curves</h3>
            <ul className="space-y-1 text-meta">
              {Object.entries(ease).map(([k, v]) => (
                <li key={k} className="flex justify-between border-b border-edge/40 py-1">
                  <span className="text-muted">{k}</span>
                  <span className="tabular-nums text-ink">
                    cubic-bezier({(v as readonly number[]).join(", ")})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel title="Primitives" subtitle="Live components — interact with them">
          <Row label="RiskBadge">
            <RiskBadge risk="low" />
            <RiskBadge risk="medium" />
            <RiskBadge risk="high" />
            <span className="text-meta text-muted">
              only high pulses{reduced ? " (paused — motion reduced)" : ""}
            </span>
          </Row>
          <Row label="StatusLabel">
            <StatusLabel status="executed" />
            <StatusLabel status="pending_approval" />
            <StatusLabel status="blocked" />
          </Row>
          <Row label="AnimatedNumber">
            <span className="font-display text-stat font-semibold tabular-nums text-ink">
              <AnimatedNumber value={counter} />
            </span>
            <span className="font-display text-stat font-semibold tabular-nums text-accent">
              <AnimatedNumber value={cost} format={(n) => `$${n.toFixed(4)}`} />
            </span>
            <motion.button
              onClick={bump}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              className="rounded-md border border-accent/50 bg-accent/15 px-3 py-1.5 text-meta font-medium text-accent transition-colors duration-fast hover:bg-accent/25"
            >
              Change values
            </motion.button>
          </Row>
          <Row label="Skeleton">
            <div className="w-72 space-y-2">
              <Skeleton width="w-32" height="h-2" />
              <Skeleton />
              <Skeleton width="w-2/3" />
            </div>
          </Row>
          <Row label="SkeletonStat">
            <SkeletonStat />
          </Row>
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2">
          <Panel title="SkeletonRows" flush>
            <SkeletonRows rows={4} />
          </Panel>
          <Panel title="SkeletonChart" flush>
            <SkeletonChart />
          </Panel>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Panel title="Interactive" interactive subtitle="Hover me — lifts and glows">
            <p className="text-meta leading-relaxed text-muted">
              Use for panels that drill into something.
            </p>
          </Panel>
          <Panel title="Live" live subtitle="Sheen marks streaming data">
            <p className="text-meta leading-relaxed text-muted">
              The sheen runs along the header edge.
            </p>
          </Panel>
          <Panel title="Danger" tone="danger" subtitle="Border picks up the risk ramp">
            <p className="text-meta leading-relaxed text-muted">
              Reserved for genuinely risk-related surfaces.
            </p>
          </Panel>
        </div>

        <Panel title="Reduced motion" subtitle="Toggle it from the top bar and watch this page">
          <p className="text-meta leading-relaxed text-muted">
            Reduction is currently{" "}
            <span className={reduced ? "text-accent" : "text-ink"}>
              {reduced ? "on" : "off"}
            </span>
            . With it on: the risk pulse stops, counters jump instead of springing, the
            shimmer flattens to a static fill, panel entrances become opacity-only, and
            the sidebar rail stops sliding. Nothing disappears — every state change is
            still visible, it just no longer moves through space.
          </p>
        </Panel>
      </motion.div>
    </div>
  );
}
