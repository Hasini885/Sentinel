"use client";

import { motion } from "framer-motion";

import {
  IconAudit,
  IconDowngrade,
  IconIntercept,
  IconPolicy,
  IconRoi,
  IconScore,
} from "@/components/marketing/Icons";
import { Reveal } from "@/components/marketing/Reveal";
import { useMotionPreference } from "@/components/ui/MotionProvider";

const FEATURES = [
  {
    Icon: IconIntercept,
    title: "Risk interception",
    benefit: "Catch every tool call before it executes, not after it has already run.",
  },
  {
    Icon: IconScore,
    title: "Multi-factor scoring",
    benefit:
      "Data sensitivity, external exposure and reversibility — weighted into one score you control.",
  },
  {
    Icon: IconPolicy,
    title: "Policy enforcement",
    benefit: "Block it, hold it for a human, or let it through. One rule per action type.",
  },
  {
    Icon: IconRoi,
    title: "ROI tracking",
    benefit: "Tokens and spend attributed to the feature that caused them, with outcomes.",
  },
  {
    Icon: IconDowngrade,
    title: "Auto-downgrade",
    benefit: "Route features whose cost outran their value to a cheaper model, automatically.",
  },
  {
    Icon: IconAudit,
    title: "Audit trail",
    benefit: "Append-only history of every decision, written atomically with the change.",
  },
];

export function FeatureGrid() {
  const { reduced } = useMotionPreference();

  return (
    <section id="features" className="border-t border-edge/60 py-20 sm:py-24">
      <div className="mx-auto max-w-none px-6 sm:px-8 lg:px-14 xl:px-20">
        <Reveal>
          <h2 className="max-w-2xl font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
            Everything between the agent and the action
          </h2>
          <p className="mt-4 max-w-2xl font-sans text-base leading-relaxed text-muted">
            Six capabilities, one pipeline. Each runs on every action your agents attempt.
          </p>
        </Reveal>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            // Stagger by column so a row appears to sweep in left-to-right
            // rather than all six racing at once.
            <li key={feature.title} className="h-full">
              <Reveal delay={(i % 3) * 0.08} className="h-full">
                <motion.div
                whileHover={reduced ? undefined : { y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  className="group relative h-full rounded-xl border border-edge bg-panel/70 p-5 transition-colors duration-base hover:border-accent/40"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent transition-colors duration-base group-hover:border-accent/60 group-hover:bg-accent/15">
                    <feature.Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-base font-semibold text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-2 font-sans text-sm leading-relaxed text-muted">
                    {feature.benefit}
                  </p>
                </motion.div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
