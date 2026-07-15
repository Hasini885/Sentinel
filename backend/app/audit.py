"""Append entries to the immutable action_events audit trail.

The helper only stages the row on the caller's session — the caller commits, so
an audit entry and the state change it describes land in the same transaction
(an entry for a change that rolled back would be a false audit record).
"""
from sqlalchemy.orm import Session

from app.models import ActionEvent


def log_action_event(
    db: Session, action_id: int, event_type: str, detail: dict | None = None
) -> None:
    db.add(ActionEvent(action_id=action_id, event_type=event_type, detail=detail))
