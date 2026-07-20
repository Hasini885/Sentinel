"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { rise, spring, stagger } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";

/**
 * Landing page — structural placeholder.
 *
 * The sections and their anchors are real so the header links resolve and the
 * page scrolls the way the finished version will; the copy and the richer
 * scroll-linked motion arrive in Phase M2.
 */

const PILLARS = [
  {
    glyph: "◈",
    title: "Intercept",
    body: "Every tool call an agent attempts is caught before it executes — not logged after the fact.",
  },
  {
    glyph: "◑",
    title: "Score",
    body: "An LLM rates data sensitivity, external exposure and reversibility; your thresholds decide the label.",
  },
  {
    glyph: "⌸",
    title: "Govern",
    body: "Policies block, hold for approval, or allow — and every decision lands in an append-only audit trail.",
  },
];

function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`mx-auto max-w-6xl px-6 ${className}`}>
      {children}
    </section>
  );
}

export default function LandingPage() {
  const { reduced } = useMotionPreference();

  return (
    <>
      <Section className="py-24 text-center sm:py-32">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.p
            variants={rise}
            className="font-sans text-sm uppercase tracking-[0.2em] text-accent"
          >
            AI agent governance &amp; ROI
          </motion.p>
          <motion.h1
            variants={rise}
            className="mx-auto mt-5 max-w-3xl font-display text-4xl font-bold leading-tight text-ink sm:text-6xl"
          >
            Know what your agents did — before they do it
          </motion.h1>
          <motion.p
            variants={rise}
            className="mx-auto mt-6 max-w-2xl font-sans text-lg leading-relaxed text-muted"
          >
            Sentinel sits between your agents and the world. Every action is intercepted,
            risk-scored, and checked against your policies — with the cost and the ROI
            attached.
          </motion.p>
          <motion.div
            variants={rise}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <motion.span whileHover={reduced ? undefined : { y: -2 }} whileTap={{ scale: 0.97 }} transition={spring.snappy}>
              <Link
                href="/signup"
                className="block rounded-lg border border-accent/50 bg-accent/15 px-6 py-3 font-sans text-sm font-medium text-accent transition-colors duration-fast hover:bg-accent/25 hover:shadow-glow"
              >
                Get started
              </Link>
            </motion.span>
            <motion.span whileHover={reduced ? undefined : { y: -2 }} whileTap={{ scale: 0.97 }} transition={spring.snappy}>
              <Link
                href="/dashboard"
                className="block rounded-lg border border-edge bg-raised/60 px-6 py-3 font-sans text-sm font-medium text-muted transition-colors duration-fast hover:border-accent/40 hover:text-ink"
              >
                View the dashboard
              </Link>
            </motion.span>
          </motion.div>
        </motion.div>
      </Section>

      <Section id="features" className="border-t border-edge/60 py-20">
        <h2 className="font-display text-2xl font-bold text-ink">What it does</h2>
        <motion.ul
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mt-8 grid gap-4 sm:grid-cols-3"
        >
          {PILLARS.map((pillar) => (
            <motion.li
              key={pillar.title}
              variants={rise}
              className="rounded-xl border border-edge bg-panel/70 p-5"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 font-display text-accent"
                aria-hidden
              >
                {pillar.glyph}
              </span>
              <h3 className="mt-3.5 font-display text-base font-semibold text-ink">
                {pillar.title}
              </h3>
              <p className="mt-1.5 font-sans text-sm leading-relaxed text-muted">
                {pillar.body}
              </p>
            </motion.li>
          ))}
        </motion.ul>
      </Section>

      <Section id="how" className="border-t border-edge/60 py-20">
        <h2 className="font-display text-2xl font-bold text-ink">How it works</h2>
        <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-muted">
          Full walkthrough — the interception pipeline, the scoring model, and the policy
          engine — arrives in Phase M2.
        </p>
      </Section>

      <Section id="pricing" className="border-t border-edge/60 py-20">
        <h2 className="font-display text-2xl font-bold text-ink">Pricing</h2>
        <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-muted">
          Placeholder section — anchored so the header link resolves. Content arrives in
          Phase M2.
        </p>
      </Section>
    </>
  );
}
