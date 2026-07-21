"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { NAV } from "@/components/shell/nav";
import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";

const WIDTH_OPEN = 208;
const WIDTH_COLLAPSED = 60;

/**
 * Primary navigation.
 *
 * The active-item highlight is a single element moved between items with
 * Framer Motion's `layoutId`. That gives a real FLIP transition — the pill
 * physically travels to the new item instead of cross-fading — which is the
 * clearest possible signal of "you moved from here to there", and is the kind
 * of thing that would be genuinely painful to hand-roll in CSS.
 *
 * Collapse state is in-memory only (no localStorage, per project constraint),
 * so it resets on reload.
 *
 * It collapses itself below the `lg` breakpoint. At 208px wide on a 390px
 * phone the rail took more than half the screen and squeezed the console into
 * 182px, which clipped table rows and form controls. An explicit choice by the
 * user always wins from then on — the automatic behaviour is a starting point,
 * not a rule that keeps overriding them.
 */
const WIDE_QUERY = "(min-width: 1024px)";

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const { reduced } = useMotionPreference();
  // Once the user touches the toggle, stop reacting to viewport changes.
  const userChose = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY);
    const apply = () => {
      if (!userChose.current) setOpen(mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <motion.nav
      aria-label="Primary"
      initial={false}
      animate={{ width: open ? WIDTH_OPEN : WIDTH_COLLAPSED }}
      transition={reduced ? { duration: 0 } : spring.drawer}
      className="relative z-20 flex shrink-0 flex-col border-r border-edge bg-panel/70 backdrop-blur-sm"
    >
      <Link
        href="/"
        title="Back to the site"
        className="flex items-center gap-2.5 px-3.5 py-4 transition-opacity duration-fast hover:opacity-80"
      >
        <div className="relative h-9 w-9 shrink-0" aria-hidden>
          {/* Slowly rotating conic halo behind the mark — the app's heartbeat. */}
          {!reduced && (
            <motion.span
              className="absolute -inset-1 rounded-xl opacity-60 blur-[6px]"
              style={{
                background:
                  "conic-gradient(from 0deg, rgb(58 231 255 / 0), rgb(58 231 255 / 0.55), rgb(58 231 255 / 0))",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
          )}
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-accent/40 bg-gradient-to-br from-accent/20 to-transparent font-display text-base font-bold text-accent shadow-glow">
            ◈
          </div>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.16 }}
              className="flex min-w-0 flex-col"
            >
              <span className="font-display text-sm font-bold leading-tight tracking-[0.18em] text-ink">
                SENTINEL
              </span>
              <span className="truncate text-micro uppercase text-muted">governance</span>
            </motion.div>
          )}
        </AnimatePresence>
      </Link>

      <ul className="flex flex-1 flex-col gap-1 px-2.5 py-2">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={open ? undefined : item.label}
                className={`relative flex items-center gap-3 rounded-md px-2.5 py-2 text-data transition-colors duration-fast ${
                  active ? "text-accent" : "text-muted hover:text-ink"
                }`}
              >
                {active && (
                  // One shared element that slides between items on navigation.
                  <motion.span
                    layoutId="nav-active"
                    transition={reduced ? { duration: 0 } : spring.layout}
                    className="absolute inset-0 -z-10 rounded-md border border-accent/30 bg-accent/10"
                  />
                )}
                <span className="w-4 shrink-0 text-center" aria-hidden>
                  {item.glyph}
                </span>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.14 }}
                      className="truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="px-2.5 pb-3">
        <motion.button
          onClick={() => {
            userChose.current = true;
            setOpen((v) => !v);
          }}
          whileTap={{ scale: 0.94 }}
          aria-expanded={open}
          aria-label={open ? "Collapse navigation" : "Expand navigation"}
          className="flex w-full items-center justify-center rounded-md border border-edge bg-raised/50 py-1.5 text-muted transition-colors duration-fast hover:border-accent/40 hover:text-accent"
        >
          <motion.span
            animate={{ rotate: open ? 0 : 180 }}
            transition={reduced ? { duration: 0 } : spring.snappy}
            aria-hidden
          >
            ‹
          </motion.span>
        </motion.button>
      </div>
    </motion.nav>
  );
}
