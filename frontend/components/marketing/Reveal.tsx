"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

import { duration, ease } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";

export type RevealProps = {
  children: React.ReactNode;
  /** Seconds of delay, for cascading siblings. */
  delay?: number;
  /** Distance travelled, px. Smaller for dense content. */
  distance?: number;
  className?: string;
};

/**
 * Reveals its children once, when they scroll into view.
 *
 * `once: true` matters: re-animating on every scroll-by turns a page into a
 * flickering mess and makes it impossible to re-read something you just passed.
 * The margin fires the reveal slightly before the element reaches the viewport,
 * so content is already settled by the time it is actually looked at.
 *
 * Under reduced motion this renders a plain element with no animation at all —
 * not a zero-duration animation. Content must never depend on an intersection
 * observer firing to become visible.
 */
export function Reveal({
  children,
  delay = 0,
  distance = 24,
  className = "",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -80px 0px" });
  const { reduced } = useMotionPreference();

  // Always a div. Callers that need a list item nest this inside their own <li>
  // rather than making the wrapper polymorphic — that keeps the markup valid
  // and avoids a ref type that has to satisfy every element it might become.
  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: distance }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: distance }}
      transition={{ duration: duration.slow, ease: ease.entrance, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
