"use client";

import { motion } from "framer-motion";

import { Reveal } from "@/components/marketing/Reveal";
import { useMotionPreference } from "@/components/ui/MotionProvider";

/**
 * The two questions Sentinel exists to answer.
 *
 * Presented as a pair of opposed cards rather than a list, because the point is
 * that most tooling answers one and ignores the other — safety monitors that
 * cannot see cost, and cost dashboards that cannot see risk.
 */

const QUESTIONS = [
  {
    tint: "risk-high",
    kicker: "Safety",
    question: "Is this agent action safe?",
    body: "An agent about to email a customer, delete a file, or issue a refund is one bad inference away from a real incident. Logging it afterwards tells you what went wrong — it does not stop it.",
    answer:
      "Sentinel intercepts the call before execution, scores it on data sensitivity, external exposure and reversibility, and blocks or holds it when it breaches your policy.",
  },
  {
    tint: "accent",
    kicker: "Cost",
    question: "Is it worth what it costs?",
    body: "Every scored action spends tokens. Without per-feature attribution, model spend is one line on an invoice and nobody can say which capability earned it.",
    answer:
      "Sentinel attributes tokens and spend to the feature that caused them, tracks the outcome each action produced, and flags features whose cost has outrun their value.",
  },
];

export function ProblemSolution() {
  const { reduced } = useMotionPreference();

  return (
    <section className="border-t border-edge/60 py-20 sm:py-24">
      <div className="mx-auto max-w-none px-6 sm:px-8 lg:px-14 xl:px-20">
        <Reveal>
          <h2 className="max-w-2xl font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
            Two questions, asked of every action
          </h2>
          <p className="mt-4 max-w-2xl font-sans text-base leading-relaxed text-muted">
            Most tooling answers one and ignores the other. Governance without cost is
            incomplete; cost without governance is dangerous.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {QUESTIONS.map((item, i) => (
            <Reveal key={item.question} delay={i * 0.1}>
              <motion.article
                whileHover={reduced ? undefined : { y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="group relative h-full overflow-hidden rounded-xl border border-edge bg-panel/70 p-6 sm:p-7"
              >
                <span
                  aria-hidden
                  className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${
                    item.tint === "accent" ? "via-accent/70" : "via-risk-high/70"
                  }`}
                />
                <span
                  className={`font-sans text-xs uppercase tracking-[0.18em] ${
                    item.tint === "accent" ? "text-accent" : "text-risk-high"
                  }`}
                >
                  {item.kicker}
                </span>
                <h3 className="mt-3 font-display text-xl font-semibold text-ink">
                  {item.question}
                </h3>
                <p className="mt-3 font-sans text-sm leading-relaxed text-muted">
                  {item.body}
                </p>
                <p className="mt-4 border-t border-edge pt-4 font-sans text-sm leading-relaxed text-ink/90">
                  {item.answer}
                </p>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
