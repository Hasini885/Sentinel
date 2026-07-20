"use client";

import { motion, type Variants } from "framer-motion";

import { duration, ease } from "@/components/ui/motion";

export type SectionTransitionProps = {
  children: React.ReactNode;
  /**
   * Make this the stagger parent for its children. Any `Panel` (or other
   * component using the `rise` variant) inside will then cascade in rather
   * than appearing together.
   * @default true
   */
  staggerChildren?: boolean;
  className?: string;
};

/** Section content arriving, with its children cascading behind it. */
const sectionStaggered: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.slow,
      ease: ease.entrance,
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

/** The same, without propagating a cascade to children. */
const sectionSolo: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: ease.entrance },
  },
};

/**
 * Wraps a route's content so it animates in on navigation.
 *
 * Used from app/template.tsx. Next.js App Router remounts `template.tsx` on
 * every navigation, which is what makes the enter animation fire reliably —
 * the usual `AnimatePresence` + `key={pathname}` approach does not get a
 * dependable exit animation in the App Router, because the outgoing route's
 * tree is torn down before Framer Motion can animate it. Enter-only, keyed off
 * the remount, is the honest version of this and costs nothing visually.
 *
 * Reduced motion is handled upstream by MotionConfig: the y-offset is dropped
 * and only the opacity fade remains.
 */
export function SectionTransition({
  children,
  staggerChildren = true,
  className = "",
}: SectionTransitionProps) {
  return (
    <motion.div
      variants={staggerChildren ? sectionStaggered : sectionSolo}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}
