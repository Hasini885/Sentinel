"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ActionFeed } from "@/components/ActionFeed";
import { FeatureRoiPanel } from "@/components/FeatureRoiPanel";
import { PendingApprovals } from "@/components/PendingApprovals";
import { PolicyEditor } from "@/components/PolicyEditor";
import { TopBar } from "@/components/TopBar";
import {
  fetchActions,
  fetchDowngradeSuggestions,
  fetchFeatureROI,
  fetchPendingApprovals,
  fetchSummary,
  type AgentAction,
  type DowngradeSuggestion,
  type FeatureROI,
  type Summary,
} from "@/lib/api";

const POLL_MS = 5000;

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [pending, setPending] = useState<AgentAction[]>([]);
  const [features, setFeatures] = useState<FeatureROI[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, DowngradeSuggestion>>({});
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Distinguishes "we have never loaded" (show skeletons) from "a later poll failed"
  // (keep the last good data on screen and just flag it) — blanking a control room
  // on a transient network blip is worse than showing slightly stale numbers.
  const [everLoaded, setEverLoaded] = useState(false);
  const inFlight = useRef(false);

  const refresh = useCallback(async (feature: string | null) => {
    if (inFlight.current) return; // a slow backend shouldn't stack up requests
    inFlight.current = true;
    try {
      const [nextSummary, nextActions, nextPending, nextFeatures] = await Promise.all([
        fetchSummary(),
        fetchActions(feature),
        fetchPendingApprovals(),
        fetchFeatureROI(),
      ]);
      const nextSuggestions = await fetchDowngradeSuggestions(
        nextFeatures.map((f) => f.feature_tag),
      );

      setSummary(nextSummary);
      setActions(nextActions.items);
      setPending(nextPending.items);
      setFeatures(nextFeatures);
      setSuggestions(nextSuggestions);
      setError(null);
      setLastUpdated(new Date());
      setEverLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reach the Sentinel API");
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh(activeFeature);
    const timer = setInterval(() => void refresh(activeFeature), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh, activeFeature]);

  const toggleFeature = (tag: string) =>
    setActiveFeature((current) => (current === tag ? null : tag));

  const loading = !everLoaded && error === null;

  return (
    <main className="flex h-screen flex-col bg-deep">
      <TopBar
        summary={summary}
        live={error === null && everLoaded}
        lastUpdated={lastUpdated}
        onOpenPolicies={() => setPoliciesOpen(true)}
      />

      {error && (
        <div className="flex items-center justify-between gap-4 border-b border-risk-high/30 bg-risk-high/10 px-6 py-2.5">
          <p className="text-xs text-risk-high">
            {error}
            {!everLoaded && (
              <>
                {" — is the backend running on "}
                <code>{process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}</code>?
              </>
            )}
            {everLoaded && " — showing the last data we received."}
          </p>
          <button
            onClick={() => void refresh(activeFeature)}
            className="shrink-0 rounded border border-risk-high/40 px-3 py-1 text-[11px] font-medium text-risk-high transition hover:bg-risk-high/15"
          >
            Retry now
          </button>
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[1.35fr_1fr]">
        <ActionFeed
          actions={actions}
          activeFeature={activeFeature}
          loading={loading}
          onClearFilter={() => setActiveFeature(null)}
        />

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          <PendingApprovals
            pending={pending}
            loading={loading}
            onDecided={() => void refresh(activeFeature)}
          />
          <FeatureRoiPanel
            features={features}
            suggestions={suggestions}
            activeFeature={activeFeature}
            loading={loading}
            onSelectFeature={toggleFeature}
          />
        </div>
      </div>

      <PolicyEditor open={policiesOpen} onClose={() => setPoliciesOpen(false)} />
    </main>
  );
}
