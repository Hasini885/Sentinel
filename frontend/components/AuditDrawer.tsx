"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { fetchAudit, type ActionEvent, type AuditRecord } from "@/lib/api";
import { RiskBadge, StatusLabel } from "@/components/Badges";
import { drawerSpring } from "@/components/motion";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${d.toLocaleTimeString([], { hour12: false })}`;
}

const EVENT_META: Record<string, { label: string; dot: string }> = {
  created: { label: "Action intercepted", dot: "bg-accent" },
  scored: { label: "Risk scored", dot: "bg-accent" },
  policy_decision: { label: "Policy decision", dot: "bg-accent" },
  approved: { label: "Approved by human", dot: "bg-risk-low" },
  rejected: { label: "Rejected by human", dot: "bg-risk-high" },
  outcome_recorded: { label: "Outcome recorded", dot: "bg-[#8B5CF6]" },
  outcome_marked: { label: "Outcome marked (legacy)", dot: "bg-edge" },
};

function decisionMeta(detail: Record<string, unknown> | null) {
  const decision = String(detail?.decision ?? "");
  if (decision === "executed") return { text: "Executed", cls: "text-risk-low" };
  if (decision === "blocked") return { text: "Blocked", cls: "text-risk-high" };
  if (decision === "pending_approval")
    return { text: "Held for approval", cls: "text-risk-medium" };
  return { text: decision || "—", cls: "text-muted" };
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-[11px] leading-snug">
      <span className="w-32 shrink-0 text-muted">{k}</span>
      <span className="min-w-0 break-words text-ink">{v}</span>
    </div>
  );
}

function FactorLine({ name, score, reason }: { name: string; score: number; reason?: string }) {
  const tone = score >= 7 ? "bg-risk-high" : score >= 4 ? "bg-risk-medium" : "bg-risk-low";
  return (
    <div className="flex items-start gap-2 text-[11px]">
      <span className="w-32 shrink-0 text-muted">{name}</span>
      <div className="mt-1 h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-edge">
        <div className={`h-1.5 rounded-full ${tone}`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className="w-9 shrink-0 tabular-nums text-ink">{score}/10</span>
      <span className="min-w-0 leading-snug text-muted">{reason ?? ""}</span>
    </div>
  );
}

function EventDetail({ event }: { event: ActionEvent }) {
  const d = event.detail;
  if (!d) return null;

  switch (event.event_type) {
    case "created":
      return (
        <pre className="mt-1.5 max-h-40 overflow-auto rounded border border-edge bg-deep px-2 py-1.5 text-[10px] leading-relaxed text-muted">
          {JSON.stringify(d.payload ?? d, null, 2)}
        </pre>
      );

    case "scored": {
      const fr = (d.factor_reasoning ?? {}) as Record<string, string>;
      return (
        <div className="mt-1.5 space-y-1.5">
          {typeof d.data_sensitivity === "number" ? (
            <>
              <FactorLine name="Data sensitivity" score={d.data_sensitivity} reason={fr.data_sensitivity} />
              <FactorLine name="External exposure" score={d.external_exposure as number} reason={fr.external_exposure} />
              <FactorLine name="Reversibility" score={d.reversibility as number} reason={fr.reversibility} />
              <KV
                k="Composite"
                v={`${d.composite_score ?? "—"}/10 → ${String(d.risk_score).toUpperCase()}`}
              />
            </>
          ) : (
            <KV k="Risk" v={`${String(d.risk_score).toUpperCase()} — ${String(d.risk_reason)}`} />
          )}
          <KV
            k="Model"
            v={
              <>
                {String(d.model_used)}
                {d.downgraded === true && (
                  <span className="ml-1.5 rounded border border-accent/40 bg-accent/10 px-1 py-px text-[9px] uppercase tracking-widest text-accent">
                    auto-downgraded
                  </span>
                )}
              </>
            }
          />
          {d.downgraded === true && <KV k="Routing" v={String(d.routing_reason)} />}
          <KV k="Feature" v={String(d.feature_tag)} />
        </div>
      );
    }

    case "policy_decision": {
      const meta = decisionMeta(d);
      const rule = d.rule as Record<string, unknown> | null;
      return (
        <div className="mt-1.5 space-y-1">
          <KV k="Decision" v={<span className={`font-medium ${meta.cls}`}>{meta.text}</span>} />
          <KV
            k="Rule"
            v={
              rule
                ? `${String(rule.action_type)}: risk ≥ ${String(rule.risk_threshold)} → ${String(rule.on_breach)}`
                : "no matching rule — default allow"
            }
          />
        </div>
      );
    }

    case "approved":
    case "rejected":
      return (
        <div className="mt-1.5">
          <KV k="Decided by" v={String(d.decided_by ?? "unknown")} />
        </div>
      );

    case "outcome_recorded":
      return (
        <div className="mt-1.5 space-y-1">
          <KV k="Outcome" v={String(d.outcome)} />
          <KV k="Value" v={`$${Number(d.value_usd).toFixed(2)}`} />
        </div>
      );

    default:
      return (
        <pre className="mt-1.5 max-h-32 overflow-auto rounded border border-edge bg-deep px-2 py-1.5 text-[10px] leading-relaxed text-muted">
          {JSON.stringify(d, null, 2)}
        </pre>
      );
  }
}

function Timeline({ events }: { events: ActionEvent[] }) {
  return (
    <ol className="relative space-y-5 border-l border-edge pl-5">
      {events.map((event) => {
        const meta = EVENT_META[event.event_type] ?? {
          label: event.event_type,
          dot: "bg-muted",
        };
        return (
          <li key={event.id} className="relative">
            <span
              className={`absolute -left-[26.5px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-panel ${meta.dot}`}
              aria-hidden
            />
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-medium text-ink">{meta.label}</span>
              <span className="shrink-0 text-[10px] tabular-nums text-muted">
                {formatWhen(event.created_at)}
              </span>
            </div>
            <EventDetail event={event} />
          </li>
        );
      })}
    </ol>
  );
}

export function AuditDrawer({
  actionId,
  onClose,
}: {
  actionId: number | null;
  onClose: () => void;
}) {
  const [audit, setAudit] = useState<AuditRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (actionId === null) return;
    setAudit(null);
    setError(null);
    fetchAudit(actionId)
      .then(setAudit)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load the audit trail"),
      );
  }, [actionId]);

  const action = audit?.action;

  return (
    <AnimatePresence>
      {actionId !== null && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            onClick={(e) => e.stopPropagation()}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={drawerSpring}
            className="flex h-full w-full max-w-xl flex-col border-l border-edge bg-panel shadow-[-24px_0_48px_rgba(0,0,0,0.45)]"
          >
        <div className="flex items-start justify-between border-b border-edge px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted">
              Audit trail · action #{actionId}
            </p>
            {action ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="font-display text-sm font-semibold text-ink">
                  {action.action_type}
                </h2>
                <RiskBadge risk={action.risk_score} />
                <StatusLabel status={action.status} />
              </div>
            ) : (
              <h2 className="mt-1 font-display text-sm font-semibold text-muted">Loading…</h2>
            )}
            {action && (
              <p className="mt-1 text-[11px] text-muted">
                {action.agent_name} · {action.feature_tag}
                {action.model_used && <> · scored with {action.model_used}</>}
                {action.downgraded && <> (auto-downgraded)</>}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded border border-edge px-2 py-1 text-xs text-muted transition hover:text-ink"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {error && (
            <p className="rounded border border-risk-high/30 bg-risk-high/10 px-3 py-2 text-[11px] text-risk-high">
              {error}
            </p>
          )}

          {audit && (
            <>
              {audit.events.length > 0 ? (
                <Timeline events={audit.events} />
              ) : (
                <div className="space-y-4">
                  <p className="rounded border border-edge bg-raised/60 px-3 py-2 text-[11px] leading-snug text-muted">
                    This action predates the audit log — no event trail exists. The
                    record below is its current state.
                  </p>
                  <div className="space-y-1.5">
                    <KV k="Risk" v={`${audit.action.risk_score.toUpperCase()} — ${audit.action.risk_reason}`} />
                    {audit.composite_score !== null && (
                      <KV k="Composite" v={`${audit.composite_score}/10`} />
                    )}
                    {audit.action.model_used && <KV k="Model" v={audit.action.model_used} />}
                    <KV k="Outcome" v={audit.action.outcome ?? "not judged"} />
                  </div>
                  <pre className="max-h-48 overflow-auto rounded border border-edge bg-deep px-2 py-1.5 text-[10px] leading-relaxed text-muted">
                    {JSON.stringify(audit.action.action_payload, null, 2)}
                  </pre>
                </div>
              )}

              {audit.outcome_events.length > 0 && (
                <div className="mt-6 border-t border-edge pt-4">
                  <h3 className="text-[10px] uppercase tracking-widest text-muted">
                    Outcome events
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {audit.outcome_events.map((oe) => (
                      <li
                        key={oe.id}
                        className="flex items-center justify-between rounded border border-[#8B5CF6]/25 bg-[#8B5CF6]/5 px-3 py-1.5 text-[11px]"
                      >
                        <span className="text-ink">{oe.event_type}</span>
                        <span className="tabular-nums text-muted">
                          ${oe.value_usd.toFixed(2)} · {formatWhen(oe.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-edge px-5 py-3">
          <p className="text-[10px] leading-snug text-muted/70">
            Append-only record — entries are written atomically with the changes they
            describe and are never edited or deleted.
          </p>
        </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
