"use client";

import { AnimatePresence, motion } from "framer-motion";

import { useSentinelData } from "@/components/data/SentinelDataProvider";
import { spring } from "@/components/ui/motion";

/**
 * Persistent notice while demo mode is on.
 *
 * It sits in the shell rather than on a page so it follows you between routes.
 * Demo data is indistinguishable from real data by design — it uses the same
 * shapes and the same components — so the banner is the only thing preventing
 * someone from mistaking a replay for their production feed. It is not
 * dismissable for that reason; the only way to remove it is to leave the mode.
 */
export function DemoBanner() {
  const { demoMode, setDemoMode } = useSentinelData();

  return (
    <AnimatePresence initial={false}>
      {demoMode && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={spring.soft}
          className="shrink-0 overflow-hidden"
        >
          <div className="flex items-center gap-3 border-b border-accent/30 bg-accent/10 px-6 py-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent breathe" aria-hidden />
            <p className="font-sans text-meta text-accent">
              <span className="font-semibold">Demo mode</span> — replaying a scripted
              burst. These actions are simulated in your browser and are not in the
              database.
            </p>
            <button
              onClick={() => setDemoMode(false)}
              className="ml-auto shrink-0 rounded border border-accent/40 px-2.5 py-1 text-micro uppercase text-accent transition-colors duration-fast hover:bg-accent/15"
            >
              Exit demo
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
