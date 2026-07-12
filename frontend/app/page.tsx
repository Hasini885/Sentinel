"use client";

import { useCallback, useEffect, useState } from "react";

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

  const refresh = useCallback(async (feature: string | null) => {
    try {
      const [nextSummary, nextActions, nextPending, nextFeatures] = await Promise.all([
        fetchSummary(),
        fetchActions(feature),
        fetchPendingApprovals(),
        fetchFeatureROI(),
      ]);
      setSummary(nextSummary);
      setActions(nextActions.items);
      setPending(nextPending.items);
      setFeatures(nextFeatures);
      setSuggestions(
        await fetchDowngradeSuggestions(nextFeatures.map((f) => f.feature_tag)),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reach the Sentinel API");
    }
  }, []);

  useEffect(() => {
    void refresh(activeFeature);
    const timer = setInterval(() => void refresh(activeFeature), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh, activeFeature]);

  const toggleFeature = (tag: string) =>
    setActiveFeature((current) => (current === tag ? null : tag));

  return (
    <main className="flex h-screen flex-col bg-deep">
      <TopBar
        summary={summary}
        live={error === null}
        onOpenPolicies={() => setPoliciesOpen(true)}
      />

      {error && (
        <div className="border-b border-risk-high/30 bg-risk-high/10 px-6 py-2 text-xs text-risk-high">
          {error} — is the backend running on{" "}
          <code>{process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}</code>?
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[1.35fr_1fr]">
        <ActionFeed
          actions={actions}
          activeFeature={activeFeature}
          onClearFilter={() => setActiveFeature(null)}
        />

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          <PendingApprovals
            pending={pending}
            onDecided={() => void refresh(activeFeature)}
          />
          <FeatureRoiPanel
            features={features}
            suggestions={suggestions}
            activeFeature={activeFeature}
            onSelectFeature={toggleFeature}
          />
        </div>
      </div>

      <PolicyEditor open={policiesOpen} onClose={() => setPoliciesOpen(false)} />
    </main>
  );
}
