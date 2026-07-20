"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import { AuditDrawer } from "@/components/AuditDrawer";
import { useSentinelData } from "@/components/data/SentinelDataProvider";
import { ActionFeed } from "@/components/feed/ActionFeed";
import { ErrorState } from "@/components/ui/States";
import { rise, stagger } from "@/components/ui/motion";
import { useToast } from "@/components/ui/Toast";
import { API_BASE } from "@/lib/api";

/**
 * The full live feed, given the whole viewport.
 *
 * All state comes from the shared provider, so arriving actions and the active
 * feature filter are already in sync with the rest of the app — navigating here
 * from the dashboard does not refetch or drop the socket.
 */
export default function ActionsPage() {
  const {
    actions,
    activeFeature,
    streamStatus,
    loading,
    unreachable,
    clearFeature,
    refresh,
    demoMode,
  } = useSentinelData();

  const [auditActionId, setAuditActionId] = useState<number | null>(null);
  const toast = useToast();

  // Demo rows have negative ids and no server-side audit trail, so opening the
  // drawer for one would fetch a row that cannot exist.
  const inspect = (actionId: number) => {
    if (actionId < 0) {
      toast.push({
        tone: "info",
        title: "No audit trail in demo mode",
        detail: "Simulated actions are never written to the database.",
      });
      return;
    }
    setAuditActionId(actionId);
  };

  if (unreachable) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-xl border border-edge bg-panel/80">
          <ErrorState
            title="Can't reach the Sentinel API"
            body={
              <>
                The feed has nothing to stream from{" "}
                <code className="text-ink">{API_BASE}</code>. Start the backend, or turn on
                demo mode from the dashboard.
              </>
            }
            onRetry={refresh}
          />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex h-full flex-col p-4 sm:p-6"
    >
      <motion.div variants={rise} className="flex min-h-0 flex-1 flex-col">
        <ActionFeed
          actions={actions}
          activeFeature={activeFeature}
          streamStatus={streamStatus}
          loading={loading && !demoMode}
          onClearFilter={clearFeature}
          onInspect={inspect}
        />
      </motion.div>

      <AuditDrawer actionId={auditActionId} onClose={() => setAuditActionId(null)} />
    </motion.div>
  );
}
