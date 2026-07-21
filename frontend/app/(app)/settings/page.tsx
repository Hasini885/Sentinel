"use client";

import { motion } from "framer-motion";

import { useSentinelData } from "@/components/data/SentinelDataProvider";
import { AutoDowngradeSettings } from "@/components/settings/AutoDowngradeSettings";
import { PolicyRulesForm } from "@/components/settings/PolicyRulesForm";
import { ErrorState } from "@/components/ui/States";
import { rise, stagger } from "@/components/ui/motion";
import { API_BASE } from "@/lib/api";

/**
 * The two things that change how Sentinel behaves.
 *
 * Kept on one page and separated by intent: policy rules decide whether an
 * action runs at all, auto-downgrade decides which model scores it. They are
 * the only controls in the app that alter future behaviour rather than
 * describing past behaviour, which is why they live together and away from the
 * read-only analytics.
 */
export default function SettingsPage() {
  const {
    features,
    suggestions,
    autoDowngrade,
    loading,
    unreachable,
    refresh,
    toggleAutoDowngrade,
  } = useSentinelData();

  if (unreachable) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-xl border border-edge bg-panel/80">
          <ErrorState
            title="Can't reach the Sentinel API"
            body={
              <>
                Settings could not load from <code className="text-ink">{API_BASE}</code>.
                Start the backend and retry — editing policies while disconnected would
                silently fail to save.
              </>
            }
            onRetry={refresh}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex w-full flex-col gap-4 p-4 sm:p-6"
      >
        <motion.section
          variants={rise}
          className="rounded-xl border border-edge bg-panel/80 shadow-panel"
        >
          <div className="border-b border-edge px-5 py-4">
            <h2 className="font-display text-data font-semibold uppercase tracking-[0.12em] text-ink">
              Policy rules
            </h2>
            <p className="mt-1 font-sans text-meta leading-relaxed text-muted">
              One rule per action type. The LLM judges the payload; you own the
              thresholds — lower a threshold to catch more, raise it to catch less.
            </p>
          </div>
          <div className="p-5">
            <PolicyRulesForm />
          </div>
        </motion.section>

        <motion.section
          variants={rise}
          className="rounded-xl border border-edge bg-panel/80 shadow-panel"
        >
          <div className="border-b border-edge px-5 py-4">
            <h2 className="font-display text-data font-semibold uppercase tracking-[0.12em] text-ink">
              Auto-downgrade
            </h2>
            <p className="mt-1 font-sans text-meta leading-relaxed text-muted">
              When on, actions belonging to a flagged feature are scored by the cheaper
              model automatically. Changes take effect on the next action.
            </p>
          </div>
          <div className="p-5">
            <AutoDowngradeSettings
              features={features}
              suggestions={suggestions}
              autoDowngrade={autoDowngrade}
              loading={loading}
              onToggle={toggleAutoDowngrade}
            />
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
