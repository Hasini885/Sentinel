"use client";

import { useEffect, useState } from "react";

import { fetchPolicies, savePolicies, type PolicyRule } from "@/lib/api";

export function PolicyEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  // Re-pull on open so the editor never shows a stale copy of the rules.
  useEffect(() => {
    if (!open) return;
    setStatus("idle");
    setError(null);
    fetchPolicies()
      .then((policies) => setText(JSON.stringify(policies, null, 2)))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load policies"));
  }, [open]);

  if (!open) return null;

  async function save() {
    let parsed: PolicyRule[];
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      setError(`Not valid JSON — ${err instanceof Error ? err.message : "parse failed"}`);
      return;
    }
    if (!Array.isArray(parsed)) {
      setError("Policies must be a JSON array of rules.");
      return;
    }

    setStatus("saving");
    setError(null);
    try {
      const saved = await savePolicies(parsed);
      setText(JSON.stringify(saved, null, 2));
      setStatus("saved");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
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
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setStatus("idle");
            }}
            spellCheck={false}
            className="h-full min-h-[24rem] w-full resize-none rounded border border-edge bg-deep p-4 font-mono text-xs leading-relaxed text-ink outline-none focus:border-accent/60"
          />
        </div>

        <div className="border-t border-edge px-5 py-4">
          {error && (
            <p className="mb-3 rounded border border-risk-high/30 bg-risk-high/10 px-3 py-2 text-[11px] leading-snug text-risk-high">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted">
              <span className="text-accent">risk_threshold</span>: low | medium | high
              &nbsp;·&nbsp;
              <span className="text-accent">on_breach</span>: block | require_approval
            </p>
            <div className="flex items-center gap-3">
              {status === "saved" && (
                <span className="text-[11px] text-risk-low">Saved</span>
              )}
              <button
                onClick={save}
                disabled={status === "saving"}
                className="rounded border border-accent/50 bg-accent/15 px-4 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/25 disabled:opacity-40"
              >
                {status === "saving" ? "Saving…" : "Save rules"}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
