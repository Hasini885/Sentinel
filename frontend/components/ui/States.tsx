"use client";

import { motion } from "framer-motion";

import { duration, ease, spring, staggerTight } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";

/**
 * Empty and error states.
 *
 * Both are built from the same parts so a dashboard that has nothing to show
 * still looks deliberate rather than broken. The distinction matters: "nothing
 * has happened yet" and "we could not reach the backend" are different
 * situations and must never look alike.
 */

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.entrance } },
};

/** Concentric rings that breathe — a system idling, not a system broken. */
function IdleMark({ tone = "accent" }: { tone?: "accent" | "danger" }) {
  const { reduced } = useMotionPreference();
  const ring = tone === "danger" ? "border-risk-high/40" : "border-accent/40";
  const core = tone === "danger" ? "bg-risk-high/15" : "bg-accent/15";
  const text = tone === "danger" ? "text-risk-high" : "text-accent";

  return (
    <div className="relative flex h-14 w-14 items-center justify-center" aria-hidden>
      {!reduced &&
        [0, 1].map((i) => (
          <motion.span
            key={i}
            className={`absolute inset-0 rounded-full border ${ring}`}
            animate={{ scale: [1, 1.5], opacity: [0.55, 0] }}
            transition={{
              duration: 2.6,
              repeat: Infinity,
              ease: "easeOut",
              delay: i * 1.3,
            }}
          />
        ))}
      <span
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border ${ring} ${core} ${text} text-lg`}
      >
        {tone === "danger" ? "!" : "◈"}
      </span>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  hint,
  action,
}: {
  title: string;
  body: React.ReactNode;
  /** Monospace line — usually the command that would produce data. */
  hint?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      variants={staggerTight}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center gap-3 px-6 py-12 text-center"
    >
      <motion.div variants={item}>
        <IdleMark />
      </motion.div>
      <motion.p variants={item} className="font-display text-data font-semibold text-ink">
        {title}
      </motion.p>
      <motion.p variants={item} className="max-w-sm text-meta leading-relaxed text-muted">
        {body}
      </motion.p>
      {hint && (
        <motion.p
          variants={item}
          className="rounded border border-edge bg-deep/60 px-2.5 py-1.5 text-meta text-muted"
        >
          {hint}
        </motion.p>
      )}
      {action && <motion.div variants={item}>{action}</motion.div>}
    </motion.div>
  );
}

export function ErrorState({
  title,
  body,
  onRetry,
  retrying = false,
}: {
  title: string;
  body: React.ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const { reduced } = useMotionPreference();

  return (
    <motion.div
      variants={staggerTight}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center gap-3 px-6 py-12 text-center"
    >
      <motion.div variants={item}>
        <IdleMark tone="danger" />
      </motion.div>
      <motion.p variants={item} className="font-display text-data font-semibold text-ink">
        {title}
      </motion.p>
      <motion.p variants={item} className="max-w-sm text-meta leading-relaxed text-muted">
        {body}
      </motion.p>
      {onRetry && (
        <motion.button
          variants={item}
          onClick={onRetry}
          disabled={retrying}
          whileHover={reduced ? undefined : { y: -1 }}
          whileTap={reduced ? undefined : { scale: 0.96 }}
          transition={spring.snappy}
          className="flex items-center gap-2 rounded-md border border-risk-high/40 bg-risk-high/10 px-3.5 py-1.5 text-meta font-medium text-risk-high transition-colors duration-fast hover:bg-risk-high/20 disabled:opacity-50"
        >
          {retrying && !reduced && (
            <motion.span
              className="h-2.5 w-2.5 rounded-full border border-current border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              aria-hidden
            />
          )}
          {retrying ? "Retrying…" : "Retry now"}
        </motion.button>
      )}
    </motion.div>
  );
}
