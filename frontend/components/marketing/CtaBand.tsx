"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { Reveal } from "@/components/marketing/Reveal";
import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";

export function CtaBand() {
  const { reduced } = useMotionPreference();

  return (
    <section className="border-t border-edge/60 py-20 sm:py-28">
      <div className="mx-auto max-w-[100rem] px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-panel/70 px-6 py-14 text-center sm:px-12">
            {/* Soft accent wash behind the band, breathing slowly. */}
            {!reduced && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 120% at 50% 0%, rgb(58 231 255 / 0.16), transparent 70%)",
                }}
                animate={{ opacity: [0.65, 1, 0.65] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
            )}

            <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
              Put a governance layer in front of your agents
            </h2>
            <p className="mx-auto mt-4 max-w-xl font-sans text-base leading-relaxed text-muted">
              Start with one decorator. See every action, its risk, and what it cost —
              before it runs.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <motion.span
                whileHover={reduced ? undefined : { y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={spring.snappy}
              >
                <Link
                  href="/signup"
                  className="block rounded-lg border border-accent/50 bg-accent/15 px-7 py-3 font-sans text-sm font-medium text-accent transition-colors duration-fast hover:bg-accent/25 hover:shadow-glow"
                >
                  Get started
                </Link>
              </motion.span>
              <motion.span
                whileHover={reduced ? undefined : { y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={spring.snappy}
              >
                <Link
                  href="/dashboard"
                  className="block rounded-lg border border-edge bg-raised/60 px-7 py-3 font-sans text-sm font-medium text-muted transition-colors duration-fast hover:border-accent/40 hover:text-ink"
                >
                  Explore the dashboard
                </Link>
              </motion.span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
