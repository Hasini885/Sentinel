"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MotionConfig, useReducedMotion } from "framer-motion";

/**
 * Global reduced-motion mechanism.
 *
 * Three layers have to agree, because each governs a different kind of animation:
 *
 *  1. `<MotionConfig reducedMotion="user">` — Framer Motion's own switch. With
 *     it, every `motion` component in the tree drops transform/layout animation
 *     and keeps opacity, automatically, with no per-component code.
 *  2. `data-reduced-motion` on <html> — lets CSS keyframes (shimmer, edge sheen,
 *     halo) respond too. Framer Motion cannot see those; globals.css keys off
 *     this attribute.
 *  3. `useMotionPreference()` — for imperative animation that neither of the
 *     above can reach, chiefly the requestAnimationFrame canvas backdrop.
 *
 * The in-app toggle exists so the effect is demoable without changing an OS
 * setting. It starts from the OS preference and can only ever *add* reduction:
 * a user who asked their OS for less motion never gets more of it from here.
 *
 * State is in memory only — no localStorage, per project constraint — so the
 * toggle resets on reload, which is the correct default anyway (the OS
 * preference is the durable one).
 */

type MotionPreference = {
  /** True when animation should be reduced, from either the OS or the toggle. */
  reduced: boolean;
  /** True when the OS itself asked for reduced motion (toggle is then locked on). */
  systemReduced: boolean;
  /** Flip the in-app override. No-op while the OS preference forces reduction. */
  toggle: () => void;
};

const MotionPreferenceContext = createContext<MotionPreference>({
  reduced: false,
  systemReduced: false,
  toggle: () => {},
});

/** Read the current motion preference from anywhere in the tree. */
export function useMotionPreference(): MotionPreference {
  return useContext(MotionPreferenceContext);
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  // null on the server and on the very first client render, then resolves.
  const systemReduced = useReducedMotion() === true;
  const [override, setOverride] = useState(false);

  const reduced = systemReduced || override;

  const toggle = useCallback(() => {
    if (systemReduced) return; // never override the OS in the more-motion direction
    setOverride((v) => !v);
  }, [systemReduced]);

  // Mirror the resolved preference onto <html> so CSS animations can react.
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = reduced ? "true" : "false";
  }, [reduced]);

  const value = useMemo<MotionPreference>(
    () => ({ reduced, systemReduced, toggle }),
    [reduced, systemReduced, toggle],
  );

  return (
    <MotionPreferenceContext.Provider value={value}>
      {/* "user" honours the OS pref; forcing "always" applies the in-app toggle. */}
      <MotionConfig reducedMotion={reduced ? "always" : "user"}>{children}</MotionConfig>
    </MotionPreferenceContext.Provider>
  );
}
