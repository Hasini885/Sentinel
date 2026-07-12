"""PostHog emission for agent actions and their downstream outcomes.

Postgres stays the system of record — PostHog is the analytics mirror where
actions can be joined against the rest of the product's events. Everything here
degrades to a no-op when POSTHOG_API_KEY is unset, and a PostHog failure is
logged rather than raised: analytics must never take down the interceptor.
"""
import logging

from posthog import Posthog

from app.config import settings

logger = logging.getLogger(__name__)

_client: Posthog | None = None
_warned_unconfigured = False


def _get_client() -> Posthog | None:
    global _client, _warned_unconfigured
    if not settings.posthog_api_key:
        if not _warned_unconfigured:
            logger.warning(
                "POSTHOG_API_KEY is not set — agent_action analytics events "
                "will not be emitted."
            )
            _warned_unconfigured = True
        return None
    if _client is None:
        _client = Posthog(
            project_api_key=settings.posthog_api_key,
            host=settings.posthog_host,
        )
    return _client


def _capture(event: str, distinct_id: str, properties: dict) -> None:
    client = _get_client()
    if client is None:
        return
    try:
        client.capture(event, distinct_id=distinct_id, properties=properties)
    except Exception:
        logger.exception("Failed to emit PostHog event %r for %s", event, distinct_id)


def emit_agent_action(record: dict) -> None:
    """One "agent_action" event per intercepted action, keyed by the agent."""
    _capture(
        "agent_action",
        distinct_id=record["agent_name"],
        properties={
            "action_id": record["id"],
            "action_type": record["action_type"],
            "feature_tag": record["feature_tag"],
            "risk_score": record["risk_score"],
            "tokens_used": record["tokens_used"],
            "estimated_cost_usd": record["estimated_cost_usd"],
            "model_used": record["model_used"],
            "status": record["status"],
        },
    )


def emit_outcome_event(
    agent_name: str,
    action_id: int,
    feature_tag: str,
    event_type: str,
    value_usd: float,
) -> None:
    """An "agent_action_outcome" event, linked back to the action by action_id."""
    _capture(
        "agent_action_outcome",
        distinct_id=agent_name,
        properties={
            "action_id": action_id,
            "feature_tag": feature_tag,
            "outcome": event_type,
            "value_usd": value_usd,
        },
    )
