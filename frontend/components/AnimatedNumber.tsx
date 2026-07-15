"use client";

import { useEffect } from "react";
import { useMotionValue, useSpring, useTransform, motion } from "framer-motion";

/**
 * A number that springs to its target when `value` changes — so stat tiles tick
 * up instead of snapping. `format` turns the animated float into display text.
 */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toString(),
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 90, damping: 20 });
  const text = useTransform(spring, (n) => format(n));

  useEffect(() => {
    mv.set(value);
  }, [mv, value]);

  return <motion.span className={className}>{text}</motion.span>;
}
