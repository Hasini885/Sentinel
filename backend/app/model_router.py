"""Decides which model an action's scoring call should use.

Phase 3 only *suggested* downgrading low-ROI features; this module acts on it.
The downgrade fires only when both are true for the action's feature:

  1. the operator explicitly enabled auto_downgrade for the feature
     (feature_settings.auto_downgrade_enabled — default OFF), and
  2. the Phase 3 heuristic currently flags the feature as low-ROI/high-cost
     (top-quartile spend, enough judged actions, low value rate).

An action's feature_tag is only known *after* scoring (the LLM infers it), so
routing keys off the feature the same action_type most recently mapped to.
Action types map stably to features in practice; a brand-new action type just
runs on the default model until it has history.
"""
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.feature_stats import feature_rows
from app.models import AgentAction, FeatureSetting
from app.roi import DOWNGRADE_TARGET_MODEL, downgrade_suggestion


@dataclass(frozen=True)
class RoutingDecision:
    model: str
    downgraded: bool
    feature_tag: str | None
    reason: str


def _default(reason: str, feature_tag: str | None = None) -> RoutingDecision:
    return RoutingDecision(
        model=settings.risk_model, downgraded=False, feature_tag=feature_tag, reason=reason
    )


def _last_known_feature(db: Session, action_type: str) -> str | None:
    return db.scalar(
        select(AgentAction.feature_tag)
        .where(AgentAction.action_type == action_type)
        .order_by(AgentAction.timestamp.desc(), AgentAction.id.desc())
        .limit(1)
    )


def select_model(db: Session, action_type: str) -> RoutingDecision:
    """Pick the model for this action: the default, or the cheap one if the
    action's feature is opted in to auto-downgrade and currently flagged."""
    feature = _last_known_feature(db, action_type)
    if feature is None:
        return _default(f"No history for action_type {action_type!r}; using default model.")

    setting = db.get(FeatureSetting, feature)
    if setting is None or not setting.auto_downgrade_enabled:
        return _default(f"auto_downgrade is off for {feature!r}.", feature_tag=feature)

    rows = feature_rows(db)
    target = next((r for r in rows if r.feature_tag == feature), None)
    if target is None:
        return _default(f"No aggregate stats for {feature!r} yet.", feature_tag=feature)

    suggestion = downgrade_suggestion(
        feature_tag=feature,
        feature_cost=target.total_cost,
        all_costs=[r.total_cost for r in rows],
        valuable_count=target.valuable_actions,
        judged_count=target.judged_actions,
    )
    if not suggestion["suggest_downgrade"]:
        return _default(
            f"auto_downgrade is on for {feature!r} but the heuristic does not flag it: "
            f"{suggestion['reason']}",
            feature_tag=feature,
        )

    if DOWNGRADE_TARGET_MODEL == settings.risk_model:
        return _default(
            f"{feature!r} is flagged, but the default model already is the downgrade "
            f"target ({DOWNGRADE_TARGET_MODEL}).",
            feature_tag=feature,
        )

    return RoutingDecision(
        model=DOWNGRADE_TARGET_MODEL,
        downgraded=True,
        feature_tag=feature,
        reason=f"Auto-downgraded to {DOWNGRADE_TARGET_MODEL}: {suggestion['reason']}",
    )
