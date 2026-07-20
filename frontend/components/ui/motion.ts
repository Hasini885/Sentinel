import type { Transition, Variants } from "framer-motion";

/**
 * Motion tokens.
 *
 * Every animation in the app pulls its timing from here rather than hardcoding
 * numbers, so the whole system can be retuned from one file. The duration and
 * easing values mirror the CSS custom properties in app/globals.css — if you
 * change one, change the other.
 *
 * Motion principles these encode:
 *  1. Motion communicates state. Every animation answers "what changed".
 *  2. Physical, not linear. Springs over eased durations for anything that
 *     moves in space; durations only for fades and colour.
 *  3. Staggered, not simultaneous. Groups cascade so the eye can track them.
 */

/** Seconds. Matches --duration-* in globals.css. */
export const duration = {
  instant: 0.12,
  fast: 0.18,
  base: 0.28,
  slow: 0.45,
  slower: 0.7,
} as const;

/** Cubic-bezier control points. Matches --ease-* in globals.css. */
export const ease = {
  /** Default for most transitions: quick out, soft landing. */
  standard: [0.2, 0, 0, 1],
  /** Things arriving on screen — decelerate into place. */
  entrance: [0, 0, 0, 1],
  /** Things leaving — accelerate away, no lingering. */
  exit: [0.3, 0, 1, 1],
} as const;

/**
 * Springs, by personality. Higher stiffness = faster; higher damping = less
 * overshoot. `snappy` and `soft` cover most UI; the named ones exist so the
 * same element type always moves the same way across the app.
 */
export const spring = {
  /** Small, immediate feedback: buttons, badges, toggles. */
  snappy: { type: "spring", stiffness: 520, damping: 42 },
  /** Panels and cards settling into place. */
  soft: { type: "spring", stiffness: 260, damping: 30 },
  /** Large surfaces sliding in — drawers, sheets. */
  drawer: { type: "spring", stiffness: 320, damping: 34 },
  /** Numbers counting up. Loose enough to read the intermediate values. */
  counter: { stiffness: 90, damping: 20 },
  /** List items reflowing (layout animations). */
  layout: { type: "spring", stiffness: 380, damping: 40 },
} as const satisfies Record<string, Transition | { stiffness: number; damping: number }>;

/** Parent that reveals its children one after another on mount. */
export const stagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

/** Tighter stagger for dense lists where 0.08s each would feel slow. */
export const staggerTight: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.035, delayChildren: 0.02 },
  },
};

/** A panel rising and fading into place — the default child of `stagger`. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: spring.soft,
  },
};

/** Opacity-only variant — the reduced-motion substitute for `rise`. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: duration.fast } },
};

/** Section/route content arriving. Paired with SectionTransition. */
export const sectionIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: ease.entrance },
  },
};

