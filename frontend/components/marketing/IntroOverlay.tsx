"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useMotionPreference } from "@/components/ui/MotionProvider";

/**
 * Brief SENTINEL intro that plays over the landing, then reveals it.
 *
 * It renders opaque in the very first paint so the landing never flashes before
 * the intro — then the wordmark assembles with an accent glow and the overlay
 * fades out (~2.2s) to reveal the existing landing underneath, untouched.
 *
 * It is a polished entrance, not a gate:
 *  - any click, tap, or key press skips straight to the landing;
 *  - reduced-motion dismisses it immediately (no animation);
 *  - no localStorage — it is brief and skippable, so replaying it on each visit
 *    to "/" is fine by design.
 */

const WORD = "SENTINEL";
const HOLD_MS = 2200;

export function IntroOverlay() {
  const { reduced } = useMotionPreference();
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Reduced motion: don't play — clear it on the first tick.
    if (reduced) {
      setDone(true);
      return;
    }

    const timer = setTimeout(() => setDone(true), HOLD_MS);
    const skip = () => setDone(true);
    window.addEventListener("pointerdown", skip, { once: true });
    window.addEventListener("keydown", skip, { once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, [reduced]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="intro"
          aria-hidden
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-deep"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            // Instant when reduced motion dismisses it, so the landing appears
            // immediately rather than fading over half a second.
            transition: { duration: reduced ? 0 : 0.6, ease: [0.3, 0, 1, 1] },
          }}
        >
          {/* Breathing accent glow behind the wordmark. */}
          <motion.div
            className="pointer-events-none absolute h-[46rem] w-[46rem] rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgb(58 231 255 / 0.16), transparent 65%)",
            }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: [0, 0.9, 0.7], scale: [0.85, 1.05, 1] }}
            transition={{ duration: 1.6, ease: "easeOut" }}
          />

          <div className="relative flex flex-col items-center gap-5">
            <motion.span
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/25 to-transparent font-display text-2xl font-bold text-accent"
              initial={{ opacity: 0, scale: 0.6, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.6, ease: [0, 0, 0, 1] }}
              style={{ boxShadow: "0 0 32px rgb(58 231 255 / 0.45)" }}
            >
              ◈
            </motion.span>

            <div className="flex overflow-hidden">
              {WORD.split("").map((ch, i) => (
                <motion.span
                  key={i}
                  className="font-display text-4xl font-bold tracking-[0.35em] text-ink sm:text-6xl"
                  initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{
                    duration: 0.5,
                    delay: 0.25 + i * 0.06,
                    ease: [0, 0, 0, 1],
                  }}
                >
                  {ch}
                </motion.span>
              ))}
            </div>

            {/* Accent underline that draws in. */}
            <motion.span
              className="h-px w-40 origin-left bg-gradient-to-r from-transparent via-accent to-transparent"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.9, ease: [0, 0, 0, 1] }}
            />

            <motion.span
              className="mt-2 font-sans text-[11px] uppercase tracking-[0.3em] text-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 1.3 }}
            >
              agent governance &amp; ROI
            </motion.span>
          </div>

          <span className="pointer-events-none absolute bottom-8 font-sans text-[10px] uppercase tracking-[0.25em] text-muted/50">
            click to skip
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
