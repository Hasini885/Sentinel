"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { fetchPolicies, savePolicies, type PolicyRule, type RiskScore } from "@/lib/api";
import { drawerSpring } from "@/components/motion";

const THRESHOLDS: RiskScore[] = ["low", "medium", "high"];
const ON_BREACH: PolicyRule["on_breach"][] = ["block", "require_approval"];

// Convenience suggestions for the action_type field — the field is still free text,
// these just populate the datalist so common actions are one click away.
const KNOWN_ACTIONS = [
  "send_email",
  "delete_file",
  "read_customer_data",
  "query_db",
  "generate_report",
];

const ON_BREACH_LABEL: Record<PolicyRule["on_breach"], string> = {
  block: "Block",
  require_approval: "Require approval",
};

const emptyRule = (): PolicyRule => ({
  action_type: "",
  risk_threshold: "high",
  on_breach: "require_approval",
});

export function PolicyEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  // Re-pull on open so the editor never shows a stale copy of the rules.
  useEffect(() => {
    if (!open) return;
    setStatus("loading");
    setError(null);
    fetchPolicies()
      .then((policies) => {
        setRules(policies);
        setStatus("idle");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load policies");
        setStatus("idle");
      });
  }, [open]);

  const update = (index: number, patch: Partial<PolicyRule>) => {
    setRules((current) =>
      current.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    );
    setStatus("idle");
  };

  const addRule = () => {
    setRules((current) => [...current, emptyRule()]);
    setStatus("idle");
  };

  const removeRule = (index: number) => {
    setRules((current) => current.filter((_, i) => i !== index));
    setStatus("idle");
  };

  async function save() {
    const cleaned = rules.map((r) => ({ ...r, action_type: r.action_type.trim() }));

    if (cleaned.some((r) => !r.action_type)) {
      setError("Every rule needs an action type.");
      return;
    }
    const seen = new Set<string>();
    const dupes = cleaned.filter((r) => seen.size === seen.add(r.action_type).size);
    if (dupes.length) {
      const names = Array.from(new Set(dupes.map((r) => r.action_type))).join(", ");
      setError(`Only one rule per action type — duplicate: ${names}`);
      return;
    }

    setStatus("saving");
    setError(null);
    try {
      const saved = await savePolicies(cleaned);
      setRules(saved);
      setStatus("saved");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <AnimatePresence>
      {open && (
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
        <div className="flex items-center justify-between border-b border-edge px-5 py-4">
          <div>
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink">
              Policy Rules
            </h2>
            <p className="mt-0.5 text-[11px] text-muted">
              An action breaches when its risk is at or above the threshold.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded border border-edge px-2 py-1 text-xs text-muted transition hover:text-ink"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <datalist id="known-actions">
            {KNOWN_ACTIONS.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>

          <div className="mb-2 grid grid-cols-[1fr_7rem_9rem_1.75rem] gap-2 px-1 text-[10px] uppercase tracking-widest text-muted">
            <span>Action type</span>
            <span>Threshold</span>
            <span>On breach</span>
            <span />
          </div>

          <div className="space-y-2">
            {rules.map((rule, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_7rem_9rem_1.75rem] items-center gap-2 rounded border border-edge bg-deep px-2 py-2"
              >
                <input
                  value={rule.action_type}
                  onChange={(e) => update(i, { action_type: e.target.value })}
                  list="known-actions"
                  placeholder="action_type"
                  spellCheck={false}
                  className="rounded border border-edge bg-panel px-2 py-1.5 font-mono text-xs text-ink outline-none focus:border-accent/60"
                />
                <select
                  value={rule.risk_threshold}
                  onChange={(e) => update(i, { risk_threshold: e.target.value as RiskScore })}
                  className="rounded border border-edge bg-panel px-2 py-1.5 text-xs capitalize text-ink outline-none focus:border-accent/60"
                >
                  {THRESHOLDS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  value={rule.on_breach}
                  onChange={(e) =>
                    update(i, { on_breach: e.target.value as PolicyRule["on_breach"] })
                  }
                  className="rounded border border-edge bg-panel px-2 py-1.5 text-xs text-ink outline-none focus:border-accent/60"
                >
                  {ON_BREACH.map((b) => (
                    <option key={b} value={b}>
                      {ON_BREACH_LABEL[b]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removeRule(i)}
                  title="Remove rule"
                  className="flex h-7 w-7 items-center justify-center rounded border border-edge text-muted transition hover:border-risk-high/50 hover:text-risk-high"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          {rules.length === 0 && status !== "loading" && (
            <p className="rounded border border-edge bg-raised/60 px-3 py-4 text-center text-[11px] text-muted">
              No rules — every action executes. Add a rule to start governing.
            </p>
          )}
          {status === "loading" && (
            <p className="px-1 py-4 text-[11px] text-muted">Loading rules…</p>
          )}

          <button
            onClick={addRule}
            className="mt-3 w-full rounded border border-dashed border-edge px-3 py-2 text-xs text-muted transition hover:border-accent/50 hover:text-accent"
          >
            + Add rule
          </button>
        </div>

        <div className="border-t border-edge px-5 py-4">
          {error && (
            <p className="mb-3 rounded border border-risk-high/30 bg-risk-high/10 px-3 py-2 text-[11px] leading-snug text-risk-high">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted">
              <span className="text-risk-low">Block</span> stops the action ·{" "}
              <span className="text-risk-medium">Require approval</span> holds it for a human
            </p>
            <div className="flex items-center gap-3">
              {status === "saved" && <span className="text-[11px] text-risk-low">Saved</span>}
              <button
                onClick={save}
                disabled={status === "saving" || status === "loading"}
                className="rounded border border-accent/50 bg-accent/15 px-4 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/25 disabled:opacity-40"
              >
                {status === "saving" ? "Saving…" : "Save rules"}
              </button>
            </div>
          </div>
        </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
