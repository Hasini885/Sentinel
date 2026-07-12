import json
import logging
from dataclasses import dataclass
from typing import Literal

import anthropic
from pydantic import BaseModel, Field

from app.config import INPUT_COST_PER_TOKEN, OUTPUT_COST_PER_TOKEN, settings
from app.models import RiskScore

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You classify the risk of actions taken by AI agents inside a company's product.

Risk levels:
- high: irreversibly destroys data, sends anything outside the company, or exposes
  sensitive/personal customer data.
- medium: touches customer or production data in a reversible, read-mostly way, or has
  limited blast radius if wrong.
- low: internal, reversible, and uses no sensitive data.

Also tag the action with the product feature it belongs to: a short lowercase
snake_case label (e.g. "billing_reconciliation", "support_autoreply", "weekly_reporting").
Infer the feature from the action type and payload. Use "unknown" only if there is
genuinely no signal.

Be concise and specific in the reason: say what about THIS action drives the level."""


class RiskAssessment(BaseModel):
    risk: Literal["low", "medium", "high"]
    reason: str = Field(description="One sentence explaining the risk level.")
    feature_tag: str = Field(description="snake_case product feature label.")


@dataclass(frozen=True)
class ScoringResult:
    risk: RiskScore
    reason: str
    feature_tag: str
    tokens_used: int
    cost_usd: float


def _client() -> anthropic.Anthropic:
    if not settings.anthropic_api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set — the risk scorer cannot classify actions."
        )
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def score_action(agent_name: str, action_type: str, payload: dict) -> ScoringResult:
    """Classify an action's risk and feature with Claude Haiku, before it executes.

    Fails closed: if the scorer errors, the action is treated as high risk so the
    policy engine blocks or holds it rather than letting it through unclassified.
    """
    user_prompt = (
        f"Agent: {agent_name}\n"
        f"Action type: {action_type}\n"
        f"Payload:\n{json.dumps(payload, indent=2, default=str)}"
    )

    try:
        response = _client().messages.parse(
            model=settings.risk_model,
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
    cost = (
        usage.input_tokens * INPUT_COST_PER_TOKEN
        + usage.output_tokens * OUTPUT_COST_PER_TOKEN
    )

    return ScoringResult(
        risk=RiskScore(assessment.risk),
        reason=assessment.reason,
        feature_tag=assessment.feature_tag,
        tokens_used=usage.input_tokens + usage.output_tokens,
        cost_usd=cost,
    )
