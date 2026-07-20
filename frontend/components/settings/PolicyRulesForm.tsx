"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { SkeletonRows } from "@/components/ui/Skeleton";
import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";
import { useToast } from "@/components/ui/Toast";
import { fetchPolicies, savePolicies, type PolicyRule, type RiskScore } from "@/lib/api";

const THRESHOLDS: RiskScore[] = ["low", "medium", "high"];
const ON_BREACH: PolicyRule["on_breach"][] = ["block", "require_approval"];

const ON_BREACH_LABEL: Record<PolicyRule["on_breach"], string> = {
  block: "Block",
  require_approval: "Require approval",
};

/** Suggestions only — the field stays free text, since action names are yours. */
const KNOWN_ACTIONS = [
  "send_email",
  "delete_file",
  "read_customer_data",
  "issue_refund",
  "cancel_subscription",
  "access_customer_profile",
  "send_password_reset_link",
];

const emptyRule = (): PolicyRule => ({
  action_type: "",
  risk_threshold: "high",
  on_breach: "require_approval",
});

const ROW = "grid grid-cols-[1fr_7rem_10rem_2rem] gap-2";

/**
 * Structured editor for policy rules.
 *
 * A form rather than a JSON textarea: the rule shape is small and closed
 * (action type, threshold, outcome), so free-text JSON only creates a way to
 * write something the backend will reject. Validation happens before the
 * request, not after.
 */
export function PolicyRulesForm() {
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "saving">("loading");
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const toast = useToast();
  const { reduced } = useMotionPreference();

  useEffect(() => {
    let cancelled = false;
    fetchPolicies()
      .then((policies) => {
        if (cancelled) return;
        setRules(policies);
        setStatus("idle");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load policies");
        setStatus("idle");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const mutate = (next: PolicyRule[]) => {
    setRules(next);
    setDirty(true);
    setError(null);
  };

  const update = (index: number, patch: Partial<PolicyRule>) =>
    mutate(rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));

  const addRule = () => mutate([...rules, emptyRule()]);
  const removeRule = (index: number) => mutate(rules.filter((_, i) => i !== index));

  async function save() {
    const cleaned = rules.map((r) => ({ ...r, action_type: r.action_type.trim() }));

    if (cleaned.some((r) => !r.action_type)) {
      setError("Every rule needs an action type.");
      return;
    }
    const seen = new Set<string>();
    const dupes = cleaned.filter((r) => seen.size === seen.add(r.action_type).size);
    if (dupes.length > 0) {
      const names = Array.from(new Set(dupes.map((r) => r.action_type))).join(", ");
      setError(`Only one rule per action type — duplicate: ${names}`);
      return;
    }

    setStatus("saving");
    setError(null);
    try {
      const saved = await savePolicies(cleaned);
      setRules(saved);
      setDirty(false);
      toast.push({
        tone: "success",
        title: "Policies saved",
        detail: `${saved.length} rule${saved.length === 1 ? "" : "s"} now in force.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setError(message);
      toast.push({ tone: "danger", title: "Could not save policies", detail: message });
    } finally {
      setStatus("idle");
    }
  }

  if (status === "loading") return <SkeletonRows rows={4} />;

  return (
    <div className="flex flex-col gap-4">
      <datalist id="known-actions">
        {KNOWN_ACTIONS.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>

      <div className={`${ROW} px-1 text-micro uppercase text-muted`}>
        <span>Action type</span>
        <span>Threshold</span>
        <span>On breach</span>
        <span />
      </div>

      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {rules.map((rule, i) => (
            <motion.li
              key={i}
              layout={!reduced}
              initial={reduced ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0, x: 16 }}
              transition={spring.layout}
              className={`${ROW} items-center overflow-hidden rounded-lg border border-edge bg-deep/50 p-2`}
            >
              <input
                value={rule.action_type}
                onChange={(e) => update(i, { action_type: e.target.value })}
                list="known-actions"
                placeholder="action_type"
                spellCheck={false}
                aria-label={`Action type for rule ${i + 1}`}
                className="rounded border border-edge bg-panel px-2.5 py-1.5 font-mono text-data text-ink outline-none transition-colors duration-fast focus:border-accent/60"
              />
              <select
                value={rule.risk_threshold}
                onChange={(e) => update(i, { risk_threshold: e.target.value as RiskScore })}
                aria-label={`Risk threshold for rule ${i + 1}`}
                className="rounded border border-edge bg-panel px-2 py-1.5 text-data capitalize text-ink outline-none transition-colors duration-fast focus:border-accent/60"
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
                aria-label={`Outcome for rule ${i + 1}`}
                className="rounded border border-edge bg-panel px-2 py-1.5 text-data text-ink outline-none transition-colors duration-fast focus:border-accent/60"
              >
                {ON_BREACH.map((b) => (
                  <option key={b} value={b}>
                    {ON_BREACH_LABEL[b]}
                  </option>
                ))}
              </select>
              <motion.button
                onClick={() => removeRule(i)}
                whileTap={reduced ? undefined : { scale: 0.9 }}
                title="Remove rule"
                aria-label={`Remove rule ${i + 1}`}
                className="flex h-7 w-7 items-center justify-center rounded border border-edge text-muted transition-colors duration-fast hover:border-risk-high/50 hover:text-risk-high"
              >
                ×
              </motion.button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {rules.length === 0 && (
        <p className="rounded-lg border border-edge bg-raised/50 px-4 py-5 text-center font-sans text-meta text-muted">
          No rules — every action executes. Add one to start governing.
        </p>
      )}

      <motion.button
        onClick={addRule}
        whileHover={reduced ? undefined : { y: -1 }}
        whileTap={{ scale: 0.99 }}
        className="rounded-lg border border-dashed border-edge px-3 py-2.5 font-sans text-meta text-muted transition-colors duration-fast hover:border-accent/50 hover:text-accent"
      >
        + Add rule
      </motion.button>

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-lg border border-risk-high/40 bg-risk-high/10 px-3 py-2 font-sans text-meta text-risk-high"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-4">
        <p className="font-sans text-micro leading-relaxed text-muted">
          An action breaches when its risk is at or above the threshold.{" "}
          <span className="text-risk-high">Block</span> stops it ·{" "}
          <span className="text-risk-medium">Require approval</span> holds it for a human.
        </p>
        <div className="flex items-center gap-3">
          <AnimatePresence initial={false}>
            {dirty && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-sans text-micro uppercase text-risk-medium"
              >
                unsaved
              </motion.span>
            )}
          </AnimatePresence>
          <motion.button
            onClick={save}
            disabled={status === "saving" || !dirty}
            whileHover={reduced || !dirty ? undefined : { y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={spring.snappy}
            className="flex items-center gap-2 rounded-md border border-accent/50 bg-accent/15 px-4 py-2 font-sans text-meta font-medium text-accent transition-colors duration-fast hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "saving" && !reduced && (
              <motion.span
                className="h-3 w-3 rounded-full border border-current border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                aria-hidden
              />
            )}
            {status === "saving" ? "Saving…" : "Save rules"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
