"""WebSocket fan-out of the Redis actions_stream.

Each connected client gets its own async Redis XREAD loop, so clients are fully
independent: one slow or dead client never stalls another. A client may pass
?last_id=<stream entry id> to resume from where it disconnected; without it,
streaming starts at "$" (only actions that happen after connecting — history
comes from GET /api/actions).
"""
import asyncio
import json
import logging

import redis.asyncio as aioredis
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# How long one blocking XREAD waits before looping. Short enough that a closed
# socket is noticed quickly even when no actions are flowing.
XREAD_BLOCK_MS = 5000


def _opt_int(value: str | None) -> int | None:
    return int(value) if value not in (None, "") else None


def _to_action(fields: dict) -> dict:
    """Convert a Redis stream entry (all string fields) back into the ActionOut
    shape the frontend already consumes. Tolerates entries written before the
    Phase 7/8 fields existed."""
    return {
        "id": int(fields["id"]),
        "timestamp": fields["timestamp"],
        "agent_name": fields["agent_name"],
        "action_type": fields["action_type"],
        "action_payload": json.loads(fields["action_payload"]),
        "risk_score": fields["risk_score"],
        "risk_reason": fields["risk_reason"],
        "data_sensitivity": _opt_int(fields.get("data_sensitivity")),
        "external_exposure": _opt_int(fields.get("external_exposure")),
        "reversibility": _opt_int(fields.get("reversibility")),
        "factor_reasoning": json.loads(fields["factor_reasoning"])
        if fields.get("factor_reasoning")
        else None,
        "feature_tag": fields["feature_tag"],
        "model_used": fields.get("model_used") or None,
        "downgraded": fields.get("downgraded") == "true",
        "tokens_used": int(fields["tokens_used"]),
        "estimated_cost_usd": float(fields["estimated_cost_usd"]),
        "status": fields["status"],
        "outcome": fields.get("outcome") or None,
    }


async def _pump(websocket: WebSocket, redis_client: aioredis.Redis, last_id: str) -> None:
    """Redis stream -> websocket, forever. Ends when the socket send fails."""
    while True:
        entries = await redis_client.xread(
            {settings.actions_stream: last_id}, block=XREAD_BLOCK_MS, count=100
        )
        for _stream, items in entries:
            for entry_id, fields in items:
                last_id = entry_id
                try:
                    action = _to_action(fields)
                except (KeyError, ValueError, json.JSONDecodeError):
                    logger.exception("Skipping malformed stream entry %s", entry_id)
                    continue
                await websocket.send_json(
                    {"type": "action", "stream_id": entry_id, "action": action}
                )


async def _drain(websocket: WebSocket) -> None:
    """Consume (and ignore) client frames so a disconnect is noticed promptly."""
    while True:
        await websocket.receive_text()


@router.websocket("/ws/actions")
async def actions_ws(websocket: WebSocket) -> None:
    last_id = websocket.query_params.get("last_id") or "$"
    await websocket.accept()

    redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)
    pump = asyncio.create_task(_pump(websocket, redis_client, last_id))
    drain = asyncio.create_task(_drain(websocket))
    try:
        # Whichever ends first — client hung up (drain) or send failed (pump) —
        # the connection is over; cancel the survivor and clean up.
        done, pending = await asyncio.wait({pump, drain}, return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            task.cancel()
        for task in done:
            exc = task.exception()
            if exc is not None and not isinstance(exc, WebSocketDisconnect):
                logger.warning("actions_ws ended with %r", exc)
    finally:
        await redis_client.aclose()
