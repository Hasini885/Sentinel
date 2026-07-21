"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";

import { HeroVisual } from "@/components/marketing/HeroVisual";
import { rise, spring, stagger } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";

/** Pixels of scroll over which the parallax plays out, then holds. */
const HERO_SCROLL_RANGE = 700;

/**
 * Hero.
 *
 * The parallax is deliberately slight — the visual drifts ~40px across the
 * whole scroll of the section. Large parallax on a hero is the fastest way to
 * make a page feel cheap and is a vestibular trigger; this reads as depth
 * rather than movement, and is disabled outright under reduced motion.
 */
export function Hero() {
  const { reduced } = useMotionPreference();

  /**
   * Tracks raw page scroll rather than this section's own progress.
   *
   * The `target`-based form of useScroll measures by walking the element's
   * offsetParent chain until it reaches the scroll container. On a normally
   * document-scrolled page that chain terminates at <body> and never reaches
   * the scrolling element, so Framer cannot resolve the offsets and warns.
   * Since the hero always starts at the top of the page, absolute scroll
   * position is equivalent here — and needs no measurement at all.
   */
  const { scrollY } = useScroll();
  const visualY = useTransform(scrollY, [0, HERO_SCROLL_RANGE], [0, 40], { clamp: true });
  const copyY = useTransform(scrollY, [0, HERO_SCROLL_RANGE], [0, -20], { clamp: true });

  return (
    <section className="relative overflow-hidden">
      {/* Blueprint grid fading out downward — anchors the hero without a hard
          edge where it ends. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(var(--color-edge) / 0.5) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--color-edge) / 0.5) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "linear-gradient(to bottom, black, transparent 78%)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent 78%)",
        }}
      />

      <div className="mx-auto grid max-w-[100rem] items-center gap-12 px-6 py-20 sm:py-28 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          style={reduced ? undefined : { y: copyY }}
        >
          <motion.span
            variants={rise}
            className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-sans text-xs text-accent"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent breathe" aria-hidden />
            AI agent governance &amp; ROI
          </motion.span>

          <motion.h1
            variants={rise}
            className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl"
          >
            Know what your agents did —{" "}
            <span className="text-accent">before they do it</span>
          </motion.h1>

          <motion.p
            variants={rise}
            className="mt-6 max-w-xl font-sans text-base leading-relaxed text-muted sm:text-lg"
          >
            Sentinel sits between your agents and the world. Every action is
            intercepted, risk-scored, and checked against your policies before it
            runs — with the cost and the return attached to each one.
          </motion.p>

          <motion.div variants={rise} className="mt-9 flex flex-wrap items-center gap-3">
            <motion.span
              whileHover={reduced ? undefined : { y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={spring.snappy}
            >
              <Link
                href="/signup"
                className="block rounded-lg border border-accent/50 bg-accent/15 px-6 py-3 font-sans text-sm font-medium text-accent transition-colors duration-fast hover:bg-accent/25 hover:shadow-glow"
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
                href="/login"
                className="block rounded-lg border border-edge bg-raised/60 px-6 py-3 font-sans text-sm font-medium text-muted transition-colors duration-fast hover:border-accent/40 hover:text-ink"
              >
                Sign in
              </Link>
            </motion.span>
          </motion.div>

          <motion.p variants={rise} className="mt-6 font-sans text-xs text-muted/70">
            Intercepts before execution · Blocks, holds, or allows · Append-only audit
            trail
          </motion.p>
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ ...spring.soft, delay: 0.15 }}
          style={reduced ? undefined : { y: visualY }}
        >
          <HeroVisual />
        </motion.div>
      </div>
    </section>
  );
}
