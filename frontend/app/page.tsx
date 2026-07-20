"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { ActionFeed, type StreamStatus } from "@/components/ActionFeed";
import { AuditDrawer } from "@/components/AuditDrawer";
import { FeatureRoiPanel } from "@/components/FeatureRoiPanel";
import { ParticleField } from "@/components/ParticleField";
import { PendingApprovals } from "@/components/PendingApprovals";
import { PolicyEditor } from "@/components/PolicyEditor";
import { StatStrip } from "@/components/StatStrip";
import { rise, stagger } from "@/components/ui/motion";
import {
  API_BASE,
  fetchActions,
  fetchDowngradeSuggestions,
  fetchFeatureROI,
  fetchFeatureSettings,
  fetchPendingApprovals,
  fetchSummary,
  updateFeatureSetting,
  type AgentAction,
  type DowngradeSuggestion,
  type FeatureROI,
  type Summary,
} from "@/lib/api";

const POLL_MS = 5000;
const FEED_LIMIT = 50;
const WS_URL = `${API_BASE.replace(/^http/, "ws")}/ws/actions`;
const WS_MAX_BACKOFF_MS = 10_000;

// Risk → particle-field tint. New actions charge the backdrop with their colour.
const RISK_TINT: Record<string, [number, number, number]> = {
  low: [52, 211, 153],
  medium: [245, 158, 11],
  high: [244, 63, 94],
};
const ACCENT_TINT: [number, number, number] = [34, 211, 238];

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [pending, setPending] = useState<AgentAction[]>([]);
  const [features, setFeatures] = useState<FeatureROI[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, DowngradeSuggestion>>({});
  const [autoDowngrade, setAutoDowngrade] = useState<Record<string, boolean>>({});
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const [auditActionId, setAuditActionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Drives the particle backdrop: bump `pulse` whenever a new action tops the
  // feed, tinting the field with that action's risk colour.
  const [pulse, setPulse] = useState(0);
  const [tint, setTint] = useState<[number, number, number]>(ACCENT_TINT);
  const lastTopId = useRef<number | null>(null);

  // Distinguishes "we have never loaded" (show skeletons) from "a later poll failed"
  // (keep the last good data on screen and just flag it) — blanking a control room
  // on a transient network blip is worse than showing slightly stale numbers.
  const [everLoaded, setEverLoaded] = useState(false);
  const inFlight = useRef(false);

  // Live feed over WebSocket, with the 5s poll as fallback while disconnected.
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("reconnecting");
  const wsConnected = useRef(false);
  const lastStreamId = useRef<string | null>(null);
  const activeFeatureRef = useRef<string | null>(null);
  activeFeatureRef.current = activeFeature;

  const refresh = useCallback(
    async (feature: string | null, includeActions?: boolean) => {
      if (inFlight.current) return; // a slow backend shouldn't stack up requests
      inFlight.current = true;
      // While the socket is streaming, the poll skips the actions query — the feed
      // is already live. Forced fetches (initial load, filter change, approval
      // decisions, WS reconnect) re-baseline it.
      const withActions = includeActions ?? !wsConnected.current;
      try {
        const [nextSummary, nextPending, nextFeatures, nextSettings, nextActions] =
          await Promise.all([
            fetchSummary(),
            fetchPendingApprovals(),
            fetchFeatureROI(),
            fetchFeatureSettings(),
            withActions ? fetchActions(feature) : Promise.resolve(null),
          ]);
        const nextSuggestions = await fetchDowngradeSuggestions(
          nextFeatures.map((f) => f.feature_tag),
        );

        setSummary(nextSummary);
        if (nextActions) setActions(nextActions.items);
        setPending(nextPending.items);
        setFeatures(nextFeatures);
        setSuggestions(nextSuggestions);
        setAutoDowngrade(
          Object.fromEntries(
            nextSettings.map((s) => [s.feature_tag, s.auto_downgrade_enabled]),
          ),
        );
        setError(null);
        setLastUpdated(new Date());
        setEverLoaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reach the Sentinel API");
      } finally {
        inFlight.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    void refresh(activeFeature, true);
    const timer = setInterval(() => void refresh(activeFeature), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh, activeFeature]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let closed = false;

    const connect = () => {
      if (closed) return;
      const url = lastStreamId.current
        ? `${WS_URL}?last_id=${encodeURIComponent(lastStreamId.current)}`
        : WS_URL;
      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        attempts = 0;
        wsConnected.current = true;
        setStreamStatus("connected");
        if (lastStreamId.current === null) {
          // First-ever connect resumes nothing, so re-baseline the list in case
          // actions landed between the initial fetch and the socket opening.
          void refresh(activeFeatureRef.current, true);
        }
      };

      ws.onmessage = (msg: MessageEvent) => {
        let parsed: { type?: string; stream_id?: string; action?: AgentAction };
        try {
          parsed = JSON.parse(msg.data as string);
        } catch {
          return;
        }
        if (parsed.type !== "action" || !parsed.action) return;
        if (parsed.stream_id) lastStreamId.current = parsed.stream_id;

        const action = parsed.action;
        const filter = activeFeatureRef.current;
        if (filter && action.feature_tag !== filter) return;
        setActions((prev) =>
          [action, ...prev.filter((a) => a.id !== action.id)].slice(0, FEED_LIMIT),
        );
      };

      ws.onclose = () => {
        wsConnected.current = false;
        if (!closed) {
          setStreamStatus("reconnecting");
          scheduleReconnect();
        }
      };
      // onerror is always followed by onclose; reconnection lives there.
    };

    const scheduleReconnect = () => {
      if (closed || reconnectTimer !== null) return;
      const delay = Math.min(1000 * 2 ** attempts, WS_MAX_BACKOFF_MS);
      attempts += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    connect();
    return () => {
      closed = true;
      wsConnected.current = false;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [refresh]);

  // A new action reaching the top of the feed charges the particle backdrop.
  useEffect(() => {
    const top = actions[0];
    if (!top || top.id === lastTopId.current) return;
    if (lastTopId.current !== null) {
      setPulse((p) => p + 1);
      setTint(RISK_TINT[top.risk_score] ?? ACCENT_TINT);
    }
    lastTopId.current = top.id;
  }, [actions]);

  const toggleFeature = (tag: string) =>
    setActiveFeature((current) => (current === tag ? null : tag));

  const toggleAutoDowngrade = async (tag: string, enabled: boolean) => {
    // Optimistic flip so the switch doesn't lag behind the click; the next poll
    // (or the rollback below) reconciles with the server.
    setAutoDowngrade((current) => ({ ...current, [tag]: enabled }));
    try {
      await updateFeatureSetting(tag, enabled);
    } catch (err) {
      setAutoDowngrade((current) => ({ ...current, [tag]: !enabled }));
      setError(err instanceof Error ? err.message : "Failed to update feature setting");
    }
  };

  const loading = !everLoaded && error === null;

  return (
    <main className="relative flex h-full flex-col gap-4 p-4">
      <ParticleField pulse={pulse} tint={tint} />
      <StatStrip
        summary={summary}
        live={error === null && everLoaded}
        lastUpdated={lastUpdated}
        onOpenPolicies={() => setPoliciesOpen(true)}
      />

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-risk-high/30 bg-risk-high/10 px-4 py-2.5">
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
            onClick={() => void refresh(activeFeature, true)}
            className="shrink-0 rounded border border-risk-high/40 px-3 py-1 text-[11px] font-medium text-risk-high transition hover:bg-risk-high/15"
          >
            Retry now
          </button>
        </div>
      )}

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1.35fr_1fr]"
      >
        <motion.div variants={rise} className="flex min-h-0 flex-col">
          <ActionFeed
            actions={actions}
            activeFeature={activeFeature}
            streamStatus={streamStatus}
            loading={loading}
            onClearFilter={() => setActiveFeature(null)}
            onInspect={setAuditActionId}
          />
        </motion.div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          <motion.div variants={rise}>
            <PendingApprovals
              pending={pending}
              loading={loading}
              onDecided={() => void refresh(activeFeature, true)}
            />
          </motion.div>
          <motion.div variants={rise}>
            <FeatureRoiPanel
              features={features}
              suggestions={suggestions}
              autoDowngrade={autoDowngrade}
              activeFeature={activeFeature}
              loading={loading}
              onSelectFeature={toggleFeature}
              onToggleAutoDowngrade={(tag, enabled) => void toggleAutoDowngrade(tag, enabled)}
            />
          </motion.div>
        </div>
      </motion.div>

      <PolicyEditor open={policiesOpen} onClose={() => setPoliciesOpen(false)} />
      <AuditDrawer actionId={auditActionId} onClose={() => setAuditActionId(null)} />
    </main>
  );
}
