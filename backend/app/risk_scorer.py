import json
import logging
from dataclasses import dataclass
from typing import Literal

import anthropic
from pydantic import BaseModel, Field

from app.config import INPUT_COST_PER_TOKEN, MODEL_PRICING, OUTPUT_COST_PER_TOKEN, settings
from app.models import RiskScore

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You assess the risk of actions taken by AI agents inside a company's product.

Do NOT pick an overall risk level — that is computed downstream from your factor
scores. Score three independent factors, each an integer from 0 to 10:

- data_sensitivity: how sensitive is the data this action touches?
  0 = no data / synthetic test data, 5 = internal business data,
  10 = regulated personal data, credentials, or financial records.
- external_exposure: does this action send or expose anything outside the company?
  0 = purely internal, 5 = shared with a known partner system,
  10 = published publicly or sent to arbitrary external recipients.
- reversibility: how hard would this action be to undo?
  0 = trivially reversible (a read, a draft), 5 = reversible with effort,
  10 = irreversible (data destroyed, email sent, money moved).

For each factor give one short sentence of reasoning grounded in THIS action's
payload — say what about the action drives the score.

Also tag the action with the product feature it belongs to: a short lowercase
snake_case label (e.g. "billing_reconciliation", "support_autoreply", "weekly_reporting").
Infer the feature from the action type and payload. Use "unknown" only if there is
genuinely no signal."""


class FactorReasoning(BaseModel):
    data_sensitivity: str = Field(description="One sentence for the data_sensitivity score.")
    external_exposure: str = Field(description="One sentence for the external_exposure score.")
    reversibility: str = Field(description="One sentence for the reversibility score.")


class RiskAssessment(BaseModel):
    data_sensitivity: int = Field(ge=0, le=10, description="0-10: sensitivity of data touched.")
    external_exposure: int = Field(ge=0, le=10, description="0-10: data sent/exposed externally.")
    reversibility: int = Field(ge=0, le=10, description="0-10: how hard to undo (10 = irreversible).")
    factor_reasoning: FactorReasoning
    feature_tag: str = Field(description="snake_case product feature label.")


# Composite formula weights and thresholds — tune here, nowhere else.
WEIGHT_DATA_SENSITIVITY = 0.35
WEIGHT_EXTERNAL_EXPOSURE = 0.40
WEIGHT_REVERSIBILITY = 0.25
HIGH_THRESHOLD = 6.5  # composite >= this -> high
MEDIUM_THRESHOLD = 3.5  # composite >= this -> medium, else low


def composite_score(data_sensitivity: int, external_exposure: int, reversibility: int) -> float:
    """Weighted average of the three 0-10 sub-scores, still on a 0-10 scale."""
    return (
        data_sensitivity * WEIGHT_DATA_SENSITIVITY
        + external_exposure * WEIGHT_EXTERNAL_EXPOSURE
        + reversibility * WEIGHT_REVERSIBILITY
    )


def compute_risk_score(
    data_sensitivity: int, external_exposure: int, reversibility: int
) -> RiskScore:
    """Deterministic composite risk label from the three LLM sub-scores.

    The LLM supplies factors; this function — not the LLM — decides the label, so
    the mapping is auditable and identical for identical factor scores.

    Formula: weighted average (exposure 0.40, sensitivity 0.35, reversibility 0.25),
    then thresholds: >= 6.5 high, >= 3.5 medium, else low. Exposure is weighted
    highest because data leaving the company is the failure mode we can least
    contain after the fact.
    """
    score = composite_score(data_sensitivity, external_exposure, reversibility)
    if score >= HIGH_THRESHOLD:
        return RiskScore.high
    if score >= MEDIUM_THRESHOLD:
        return RiskScore.medium
    return RiskScore.low


def _summarize(assessment: RiskAssessment, risk: RiskScore) -> str:
    """Human-readable one-liner for risk_reason, led by the highest-scoring factor."""
    factors = {
        "data sensitivity": (assessment.data_sensitivity, assessment.factor_reasoning.data_sensitivity),
        "external exposure": (assessment.external_exposure, assessment.factor_reasoning.external_exposure),
        "reversibility": (assessment.reversibility, assessment.factor_reasoning.reversibility),
    }
    dominant, (dominant_score, dominant_reason) = max(factors.items(), key=lambda kv: kv[1][0])
    score = composite_score(
        assessment.data_sensitivity, assessment.external_exposure, assessment.reversibility
    )
    return (
        f"Composite {score:.1f}/10 -> {risk.value}; "
        f"top factor {dominant} ({dominant_score}/10): {dominant_reason}"
    )


@dataclass(frozen=True)
class ScoringResult:
    risk: RiskScore
    reason: str
    feature_tag: str
    tokens_used: int
    cost_usd: float
    # Sub-scores are None when scoring failed and we defaulted to high.
    data_sensitivity: int | None = None
    external_exposure: int | None = None
    reversibility: int | None = None
    factor_reasoning: dict[str, str] | None = None


def _client() -> anthropic.Anthropic:
    if not settings.anthropic_api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set — the risk scorer cannot classify actions."
        )
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def score_action(
    agent_name: str, action_type: str, payload: dict, model: str | None = None
) -> ScoringResult:
    """Score an action's risk factors with Claude, before it executes.

    `model` is whichever model the router picked (default: settings.risk_model).
    The LLM returns three 0-10 sub-scores plus reasoning; compute_risk_score()
    turns them into the low/medium/high label deterministically.

    Fails closed: if the scorer errors, the action is treated as high risk so the
    policy engine blocks or holds it rather than letting it through unclassified.
    """
    model = model or settings.risk_model
    user_prompt = (
        f"Agent: {agent_name}\n"
        f"Action type: {action_type}\n"
        f"Payload:\n{json.dumps(payload, indent=2, default=str)}"
    )

    try:
        response = _client().messages.parse(
            model=model,
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
            output_format=RiskAssessment,
        )
    except Exception as exc:
        logger.exception("Risk scoring failed for %s/%s", agent_name, action_type)
        return ScoringResult(
            risk=RiskScore.high,
            reason=f"Risk scoring failed, defaulting to high: {exc}",
            feature_tag="unknown",
            tokens_used=0,
            cost_usd=0.0,
        )

    assessment = response.parsed_output
    usage = response.usage
    input_rate, output_rate = MODEL_PRICING.get(
        model, (INPUT_COST_PER_TOKEN, OUTPUT_COST_PER_TOKEN)
    )
    cost = usage.input_tokens * input_rate + usage.output_tokens * output_rate

    risk = compute_risk_score(
        assessment.data_sensitivity,
        assessment.external_exposure,
        assessment.reversibility,
    )

    return ScoringResult(
        risk=risk,
        reason=_summarize(assessment, risk),
        feature_tag=assessment.feature_tag,
        tokens_used=usage.input_tokens + usage.output_tokens,
        cost_usd=cost,
        data_sensitivity=assessment.data_sensitivity,
        external_exposure=assessment.external_exposure,
        reversibility=assessment.reversibility,
        factor_reasoning=assessment.factor_reasoning.model_dump(),
    )
