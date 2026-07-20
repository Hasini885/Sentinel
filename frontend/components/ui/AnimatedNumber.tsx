"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";

export type AnimatedNumberProps = {
  /** Target value. Changing it springs the display from the old value. */
  value: number;
  /**
   * Turns the animated float into display text. Do the unit/precision work
   * here — e.g. `(n) => \`$${n.toFixed(4)}\``.
   * @default rounds to a whole number
   */
  format?: (n: number) => string;
  className?: string;
};

/**
 * A number that springs to its target when `value` changes, so stat tiles tick
 * up instead of snapping. Animating text content is the one case where a spring
 * genuinely aids comprehension: the movement shows both direction and magnitude
 * of the change.
 *
 * Under reduced motion the value updates instantly — an animated counter is
 * pure decoration once you remove the motion, and a fast-changing number is
 * exactly the kind of thing that triggers vestibular discomfort.
 */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toString(),
  className,
}: AnimatedNumberProps) {
  const { reduced } = useMotionPreference();

  const mv = useMotionValue(value);
  const springed = useSpring(mv, spring.counter);
  const text = useTransform(reduced ? mv : springed, (n) => format(n));

  useEffect(() => {
    if (reduced) {
      // Skip the spring entirely: jump both values so re-enabling motion later
      // doesn't animate up from a stale figure.
      mv.jump(value);
      springed.jump(value);
      return;
    }
    mv.set(value);
  }, [mv, springed, value, reduced]);

  return (
    <motion.span className={className} aria-label={format(value)}>
      {text}
    </motion.span>
  );
}
