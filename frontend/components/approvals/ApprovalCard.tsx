"use client";

import { motion } from "framer-motion";

import { FactorBars } from "@/components/feed/FactorBars";
import { factorsOf } from "@/components/feed/factors";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { spring } from "@/components/ui/motion";
import { useMotionPreference } from "@/components/ui/MotionProvider";
import type { AgentAction } from "@/lib/api";

/**
 * One action awaiting a decision.
 *
 * The risk breakdown is shown expanded by default rather than behind a click,
 * unlike the feed. In the feed you are scanning; here you are about to approve
 * something irreversible, and the factor scores are the reason to say yes or
 * no. Hiding them one interaction away would make it easy to decide without
 * having read them.
 */
function DecisionButton({
  tone,
  busy,
  onClick,
  children,
}: {
  tone: "approve" | "reject";
  busy: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const { reduced } = useMotionPreference();
  const styles =
    tone === "approve"
      ? "border-risk-low/40 bg-risk-low/10 text-risk-low hover:bg-risk-low/20 hover:shadow-[0_0_14px_rgb(52_211_153_/_0.28)]"
      : "border-risk-high/40 bg-risk-high/10 text-risk-high hover:bg-risk-high/20 hover:shadow-[0_0_14px_rgb(244_63_94_/_0.28)]";

  return (
    <motion.button
      onClick={onClick}
      disabled={busy}
      whileHover={reduced || busy ? undefined : { scale: 1.03 }}
      whileTap={busy ? undefined : { scale: 0.94 }}
      transition={spring.snappy}
      className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2 font-sans text-sm font-medium transition-colors duration-fast disabled:opacity-40 ${styles}`}
    >
      {busy && !reduced && (
        <motion.span
          className="h-3 w-3 rounded-full border border-current border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
          aria-hidden
        />
      )}
      {children}
    </motion.button>
  );
}

export function ApprovalCard({
  action,
  busy,
  onDecide,
}: {
  action: AgentAction;
  busy: boolean;
  onDecide: (decision: "approve" | "reject") => void;
}) {
  const factors = factorsOf(action);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-risk-medium/30 bg-panel/90 p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="font-mono text-base font-medium text-ink">
              {action.action_type}
            </h3>
            <RiskBadge risk={action.risk_score} />
          </div>
          <p className="mt-1 font-sans text-meta text-muted">
            {action.agent_name} · {action.feature_tag}
            {action.model_used && <> · scored with {action.model_used}</>}
          </p>
        </div>
        <div className="shrink-0 text-right font-mono text-micro tabular-nums text-muted/70">
          <div>${action.estimated_cost_usd.toFixed(5)}</div>
          <div>{action.tokens_used.toLocaleString()} tokens</div>
        </div>
      </div>

      <p className="font-sans text-sm leading-relaxed text-muted">{action.risk_reason}</p>

      {factors ? (
        <div className="rounded-lg border border-edge bg-deep/40 p-4">
          <FactorBars factors={factors} riskScore={action.risk_score} />
        </div>
      ) : (
        <p className="rounded-lg border border-edge bg-deep/40 p-4 font-sans text-meta text-muted/70">
          This action predates multi-factor scoring — no sub-scores were recorded.
        </p>
      )}

      <div>
        <h4 className="mb-1.5 text-micro uppercase text-muted/70">Payload</h4>
        <pre className="max-h-40 overflow-auto rounded-lg border border-edge bg-deep px-3 py-2 font-mono text-micro leading-relaxed tracking-normal text-muted">
          {JSON.stringify(action.action_payload, null, 2)}
        </pre>
      </div>

      <div className="flex gap-2.5 border-t border-edge pt-4">
        <DecisionButton tone="approve" busy={busy} onClick={() => onDecide("approve")}>
          Approve &amp; execute
        </DecisionButton>
        <DecisionButton tone="reject" busy={busy} onClick={() => onDecide("reject")}>
          Reject
        </DecisionButton>
      </div>
    </div>
  );
}
