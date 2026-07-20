"use client";

import { motion } from "framer-motion";

import { Reveal } from "@/components/marketing/Reveal";
import { useMotionPreference } from "@/components/ui/MotionProvider";

/**
 * The pipeline: agent → interceptor → risk + cost → dashboard.
 *
 * Laid out as a flex row that wraps to a column on small screens, with the
 * connectors rotating accordingly — one component, two orientations, no
 * duplicated markup.
 *
 * A packet travels each connector on a loop. It is the only looping animation
 * in the section, and it earns its place by showing direction of flow, which is
 * the whole point of a pipeline diagram.
 */

const STAGES = [
  {
    glyph: "◇",
    title: "Agent",
    body: "Your agent decides to call a tool — send an email, issue a refund, delete a file.",
  },
  {
    glyph: "◈",
    title: "Interceptor",
    body: "The call is caught before it executes. Nothing has happened in the outside world yet.",
  },
  {
    glyph: "◑",
    title: "Risk + cost",
    body: "An LLM scores three factors; your thresholds set the label. Tokens and spend are attributed.",
  },
  {
    glyph: "▤",
    title: "Dashboard",
    body: "Execute, hold for approval, or block — then stream the decision and its audit trail to you.",
  },
];

function Connector() {
  const { reduced } = useMotionPreference();

  return (
    <div
      aria-hidden
      className="relative flex shrink-0 items-center justify-center self-center py-3 lg:py-0"
    >
      {/* Vertical on mobile, horizontal from lg up. */}
      <span className="h-8 w-px bg-gradient-to-b from-transparent via-edge to-transparent lg:h-px lg:w-10 lg:bg-gradient-to-r" />
      {!reduced && (
        <motion.span
          className="absolute h-1.5 w-1.5 rounded-full bg-accent shadow-glow"
          animate={{
            y: [-14, 14],
            opacity: [0, 1, 1, 0],
          }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

export function HowItWorks() {
  const { reduced } = useMotionPreference();

  return (
    <section id="how" className="border-t border-edge/60 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="max-w-2xl font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 max-w-2xl font-sans text-base leading-relaxed text-muted">
            One decorator on your tool functions puts every call through the pipeline.
            Nothing reaches the outside world unreviewed.
          </p>
        </Reveal>

        <div className="mt-12 flex flex-col lg:flex-row lg:items-stretch">
          {STAGES.map((stage, i) => (
            <div key={stage.title} className="flex flex-col lg:flex-1 lg:flex-row">
              <Reveal delay={i * 0.1} className="flex-1">
                <motion.div
                  whileHover={reduced ? undefined : { y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  className="flex h-full flex-col rounded-xl border border-edge bg-panel/70 p-5"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 font-display text-accent"
                      aria-hidden
                    >
                      {stage.glyph}
                    </span>
                    <span className="font-mono text-micro uppercase text-muted/70">
                      step {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-3.5 font-display text-base font-semibold text-ink">
                    {stage.title}
                  </h3>
                  <p className="mt-2 font-sans text-sm leading-relaxed text-muted">
                    {stage.body}
                  </p>
                </motion.div>
              </Reveal>
              {i < STAGES.length - 1 && <Connector />}
            </div>
          ))}
        </div>

        <Reveal delay={0.2}>
          <div className="mt-8 overflow-x-auto rounded-xl border border-edge bg-deep/60 p-5">
            <pre className="font-mono text-data leading-relaxed text-muted">
              <span className="text-accent">@intercept_action</span>
              (agent_name=<span className="text-ink">&quot;support-copilot&quot;</span>,
              action_type=<span className="text-ink">&quot;issue_refund&quot;</span>)
              {"\n"}
              <span className="text-muted/60">def</span>{" "}
              <span className="text-ink">issue_refund</span>(customer_id, amount_usd):
              {"\n    "}
              <span className="text-muted/60">
                # runs only if policy allows it
              </span>
              {"\n    "}
              <span className="text-muted/60">return</span> payments.refund(customer_id,
              amount_usd)
            </pre>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
