import functools
import json
import logging
from typing import Any, Callable

from app.config import INPUT_COST_PER_TOKEN, settings
from app.database import SessionLocal
from app.events import publish_action
from app.models import ActionStatus, AgentAction
from app.policy import evaluate, load_policies
from app.risk_scorer import score_action

logger = logging.getLogger(__name__)


class ActionBlocked(Exception):
    """Raised when the policy engine blocks or holds an action before it executes."""

    def __init__(self, action: AgentAction):
        self.action = action
        super().__init__(
            f"{action.action_type} was {action.status.value} "
            f"(risk={action.risk_score.value}): {action.risk_reason}"
        )


def _estimate_action_tokens(payload: dict, result: Any) -> int:
    """Rough heuristic: ~4 characters per token over the action's payload and result."""
    text = json.dumps(payload, default=str) + json.dumps(result, default=str)
    return len(text) // 4


def intercept_action(agent_name: str, action_type: str) -> Callable:
    """Wrap an agent tool call: risk-score it, apply policy, log it, publish it.

    The wrapped function only runs if policy allows it. Everything else — blocked
    and pending-approval actions included — is still written to Postgres and the
    Redis stream, because the ROI side of Sentinel needs the actions that *didn't*
    happen just as much as the ones that did.
    """

    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(**payload: Any) -> Any:
            assessment = score_action(agent_name, action_type, payload)
            decision = evaluate(action_type, assessment.risk, load_policies())

            result: Any = None
            outcome: str | None = None
            if decision.status is ActionStatus.executed:
                result = fn(**payload)
                outcome = str(result)

            action_tokens = _estimate_action_tokens(payload, result)
            tokens_used = assessment.tokens_used + action_tokens
            cost = assessment.cost_usd + action_tokens * INPUT_COST_PER_TOKEN

            action = AgentAction(
                agent_name=agent_name,
                action_type=action_type,
                action_payload=payload,
                risk_score=assessment.risk,
                risk_reason=assessment.reason,
                feature_tag=assessment.feature_tag,
                tokens_used=tokens_used,
                estimated_cost_usd=round(cost, 8),
                status=decision.status,
                outcome=outcome,
            )

            with SessionLocal() as db:
                db.add(action)
                db.commit()
                db.refresh(action)
                record = {
                    "id": action.id,
                    "timestamp": action.timestamp.isoformat(),
                    "agent_name": action.agent_name,
                    "action_type": action.action_type,
                    "action_payload": action.action_payload,
                    "risk_score": action.risk_score.value,
                    "risk_reason": action.risk_reason,
                    "feature_tag": action.feature_tag,
                    "tokens_used": action.tokens_used,
                    "estimated_cost_usd": action.estimated_cost_usd,
                    "status": action.status.value,
                    "outcome": action.outcome,
                }

            publish_action(record)

            if decision.status is not ActionStatus.executed:
                raise ActionBlocked(action)

            return result

        return wrapper

    return decorator
