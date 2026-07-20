"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { rise, spring } from "@/components/ui/motion";

export type PanelProps = {
  /** Panel heading. Omit for a bare surface with no header row. */
  title?: React.ReactNode;
  /** Rendered on the right of the header — status pills, filters, actions. */
  action?: React.ReactNode;
  /** Small explanatory line under the title. */
  subtitle?: React.ReactNode;
  /** Lift and glow on hover. Use for panels that are clickable or drillable. */
  interactive?: boolean;
  /** Animate the sheen along the top edge — marks the panel carrying live data. */
  live?: boolean;
  /**
   * Border tint. `warn` and `danger` map to the risk ramp and should only be
   * used when the panel's subject really is risk-related.
   */
  tone?: "default" | "warn" | "danger";
  /** Removes the default padding so tables/lists can sit flush to the edges. */
  flush?: boolean;
  children?: React.ReactNode;
} & Omit<HTMLMotionProps<"section">, "title" | "children">;

const TONE_BORDER: Record<NonNullable<PanelProps["tone"]>, string> = {
  default: "border-edge",
  warn: "border-risk-medium/30",
  danger: "border-risk-high/30",
};

/**
 * The standard content surface: a bordered card that rises into place with the
 * shared `rise` variant and lifts on hover when interactive.
 *
 * It inherits its entrance from a parent `stagger` container when one is
 * present, so a grid of Panels cascades rather than appearing all at once.
 */
export function Panel({
  title,
  subtitle,
  action,
  interactive = false,
  live = false,
  tone = "default",
  flush = false,
  children,
  className = "",
  ...rest
}: PanelProps) {
  const hasHeader = Boolean(title || action);

  return (
    <motion.section
      variants={rise}
      whileHover={
        interactive
          ? { y: -3, boxShadow: "0 14px 38px rgb(0 0 0 / 0.35), 0 0 18px rgb(34 211 238 / 0.12)" }
          : undefined
      }
      transition={spring.soft}
      className={`flex flex-col rounded-xl border bg-panel/95 shadow-panel ${TONE_BORDER[tone]} ${
        interactive ? "cursor-pointer" : ""
      } ${className}`}
      {...rest}
    >
      {hasHeader && (
        <div
          className={`relative flex items-center justify-between gap-3 border-b border-edge px-4 py-3 ${
            live ? "edge-sheen" : ""
          }`}
        >
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-data font-semibold uppercase tracking-[0.12em] text-ink">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-0.5 text-meta text-muted">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={flush ? "min-h-0 flex-1" : "min-h-0 flex-1 p-4"}>{children}</div>
    </motion.section>
  );
}
