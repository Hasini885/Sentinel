import json
import logging

import redis

from app.config import settings

logger = logging.getLogger(__name__)

_redis_client: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis_client


def publish_action(record: dict) -> str | None:
    """Append an intercepted action to the Redis stream. Returns the stream entry ID.

    A publish failure must not undo an action that already executed, so this logs
    and returns None rather than raising — Postgres remains the system of record.
    """
    fields = {
        "id": str(record["id"]),
        "timestamp": record["timestamp"],
        "agent_name": record["agent_name"],
        "action_type": record["action_type"],
        "action_payload": json.dumps(record["action_payload"], default=str),
        "risk_score": record["risk_score"],
        "risk_reason": record["risk_reason"],
        "feature_tag": record["feature_tag"],
        "tokens_used": str(record["tokens_used"]),
        "estimated_cost_usd": str(record["estimated_cost_usd"]),
        "status": record["status"],
        "outcome": record["outcome"] or "",
    }

    try:
        return get_redis().xadd(settings.actions_stream, fields)
    except redis.RedisError:
        logger.exception("Failed to publish action %s to %s", record["id"], settings.actions_stream)
        return None
