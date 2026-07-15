import type { Variants } from "framer-motion";

/** Parent that reveals its children one after another on mount. */
export const stagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

/** A panel rising and fading into place — the default child of `stagger`. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 260, damping: 30 },
  },
};

/** Spring used for the slide-in side drawers. */
export const drawerSpring = { type: "spring", stiffness: 320, damping: 34 } as const;
