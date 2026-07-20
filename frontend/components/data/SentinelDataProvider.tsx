"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useDemoMode } from "@/components/useDemoMode";
import { useToast } from "@/components/ui/Toast";
import type { StreamStatus } from "@/components/feed/ActionFeed";
import {
  API_BASE,
  fetchActions,
  fetchDowngradeSuggestions,
  fetchFeatureROI,
  fetchFeatureSettings,
  fetchPendingApprovals,
  fetchRiskDistribution,
  fetchSummary,
  updateFeatureSetting,
  type AgentAction,
  type DowngradeSuggestion,
  type FeatureROI,
  type RiskScore,
  type Summary,
} from "@/lib/api";

/**
 * One data source for the whole authenticated app.
 *
 * This lives in the (app) layout rather than in any page, because the layout
 * persists across navigation while pages do not. If each route owned its own
 * polling and WebSocket, moving between /dashboard and /actions would tear down
 * and re-open the socket every time — dropping live actions mid-navigation and
 * opening N sockets for N tabs of the same app.
 *
 * Demo mode lives here too, so a demo survives navigation instead of resetting
 * whenever the route changes.
 */

const POLL_MS = 5000;
const FEED_LIMIT = 200; // backend caps /api/actions at 200
const WS_URL = `${API_BASE.replace(/^http/, "ws")}/ws/actions`;
const WS_MAX_BACKOFF_MS = 10_000;

/** Risk → particle-field tint. New actions charge the backdrop with their colour. */
const RISK_TINT: Record<string, [number, number, number]> = {
  low: [52, 211, 153],
  medium: [245, 158, 11],
  high: [244, 63, 94],
};
const ACCENT_TINT: [number, number, number] = [34, 211, 238];

export type SentinelData = {
  actions: AgentAction[];
  pending: AgentAction[];
  summary: Summary | null;
  features: FeatureROI[];
  suggestions: Record<string, DowngradeSuggestion>;
  autoDowngrade: Record<string, boolean>;
  riskCounts: Record<RiskScore, number> | null;

  streamStatus: StreamStatus;
  error: string | null;
  lastUpdated: Date | null;
  /** True only before the first successful load — drives skeletons, not spinners. */
  loading: boolean;
  everLoaded: boolean;
  /** Nothing has ever loaded and the API is failing. */
  unreachable: boolean;

  activeFeature: string | null;
  toggleFeature: (tag: string) => void;
  clearFeature: () => void;

  demoMode: boolean;
  setDemoMode: (on: boolean) => void;
  demoDecide: (id: number, decision: "approve" | "reject") => void;

  refresh: () => void;
  toggleAutoDowngrade: (tag: string, enabled: boolean) => void;

  /** Drives the ambient particle backdrop. */
  pulse: number;
  tint: [number, number, number];
};

const SentinelContext = createContext<SentinelData | null>(null);

export function useSentinelData(): SentinelData {
  const value = useContext(SentinelContext);
  if (!value) {
    throw new Error("useSentinelData must be used inside SentinelDataProvider");
  }
  return value;
}

export function SentinelDataProvider({ children }: { children: React.ReactNode }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [pending, setPending] = useState<AgentAction[]>([]);
  const [features, setFeatures] = useState<FeatureROI[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, DowngradeSuggestion>>({});
  const [autoDowngrade, setAutoDowngrade] = useState<Record<string, boolean>>({});
  const [riskCounts, setRiskCounts] = useState<Record<RiskScore, number> | null>(null);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [everLoaded, setEverLoaded] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const [pulse, setPulse] = useState(0);
  const [tint, setTint] = useState<[number, number, number]>(ACCENT_TINT);
  const lastTopId = useRef<number | null>(null);

  const inFlight = useRef(false);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("reconnecting");
  const wsConnected = useRef(false);
  const lastStreamId = useRef<string | null>(null);
  const activeFeatureRef = useRef<string | null>(null);
  activeFeatureRef.current = activeFeature;

  // Held in a ref so the socket effect does not list the toast context as a
  // dependency — a reconnect on every render would be worse than no toasts.
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const demo = useDemoMode(demoMode);

  const refresh = useCallback(
    async (feature: string | null, includeActions?: boolean) => {
      if (inFlight.current) return; // a slow backend shouldn't stack up requests
      inFlight.current = true;
      // While the socket is streaming, the poll skips the actions query — the
      // feed is already live. Forced fetches re-baseline it.
      const withActions = includeActions ?? !wsConnected.current;
      try {
        const [nextSummary, nextPending, nextFeatures, nextSettings, nextRisk, nextActions] =
          await Promise.all([
            fetchSummary(),
            fetchPendingApprovals(),
            fetchFeatureROI(),
            fetchFeatureSettings(),
            fetchRiskDistribution(feature),
            withActions ? fetchActions(feature, FEED_LIMIT) : Promise.resolve(null),
          ]);
        const nextSuggestions = await fetchDowngradeSuggestions(
          nextFeatures.map((f) => f.feature_tag),
        );

        setSummary(nextSummary);
        if (nextActions) setActions(nextActions.items);
        setPending(nextPending.items);
        setFeatures(nextFeatures);
        setRiskCounts(nextRisk);
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

        // Governance decisions announce themselves — a blocked action arriving
        // in a scrolling list is easy to miss, and it is the point of the tool.
        if (action.status === "blocked") {
          toastRef.current.push({
            tone: "danger",
            title: "Action blocked",
            detail: `${action.action_type} breached policy at ${action.risk_score} risk.`,
          });
        } else if (action.status === "pending_approval") {
          toastRef.current.push({
            tone: "warn",
            title: "Approval required",
            detail: `${action.action_type} is held for a human decision.`,
          });
        }
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

  // Demo mode swaps the whole slice at once, so the feed, the charts and the
  // approvals list can never disagree about what they are showing.
  const view = demoMode
    ? {
        actions: demo.slice.actions,
        pending: demo.slice.pending,
        summary: demo.slice.summary,
        features: demo.slice.features,
        riskCounts: demo.slice.riskCounts,
      }
    : { actions, pending, summary, features, riskCounts };

  // A new action reaching the top of the feed charges the particle backdrop.
  useEffect(() => {
    const top = view.actions[0];
    if (!top || top.id === lastTopId.current) return;
    if (lastTopId.current !== null) {
      setPulse((p) => p + 1);
      setTint(RISK_TINT[top.risk_score] ?? ACCENT_TINT);
    }
    lastTopId.current = top.id;
  }, [view.actions]);

  const toggleAutoDowngrade = useCallback(
    async (tag: string, enabled: boolean) => {
      // Optimistic flip so the switch doesn't lag the click; the next poll (or
      // the rollback below) reconciles with the server.
      setAutoDowngrade((current) => ({ ...current, [tag]: enabled }));
      try {
        await updateFeatureSetting(tag, enabled);
      } catch (err) {
        setAutoDowngrade((current) => ({ ...current, [tag]: !enabled }));
        setError(err instanceof Error ? err.message : "Failed to update feature setting");
      }
    },
    [],
  );

  const loading = !everLoaded && error === null && !demoMode;
  const unreachable = !everLoaded && error !== null && !demoMode;

  const value = useMemo<SentinelData>(
    () => ({
      ...view,
      suggestions: demoMode ? {} : suggestions,
      autoDowngrade,
      streamStatus: demoMode ? "connected" : streamStatus,
      error,
      lastUpdated,
      loading,
      everLoaded,
      unreachable,
      activeFeature,
      toggleFeature: (tag: string) =>
        setActiveFeature((current) => (current === tag ? null : tag)),
      clearFeature: () => setActiveFeature(null),
      demoMode,
      setDemoMode,
      demoDecide: demo.decide,
      refresh: () => void refresh(activeFeatureRef.current, true),
      toggleAutoDowngrade: (tag, enabled) => void toggleAutoDowngrade(tag, enabled),
      pulse,
      tint,
    }),
    // `view` is rebuilt each render from state that is itself in this list, so
    // spreading it here is safe; listing its fields individually would be noise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      view.actions,
      view.pending,
      view.summary,
      view.features,
      view.riskCounts,
      suggestions,
      autoDowngrade,
      streamStatus,
      error,
      lastUpdated,
      loading,
      everLoaded,
      unreachable,
      activeFeature,
      demoMode,
      demo.decide,
      refresh,
      toggleAutoDowngrade,
      pulse,
      tint,
    ],
  );

  return <SentinelContext.Provider value={value}>{children}</SentinelContext.Provider>;
}
