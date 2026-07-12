from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ActionStatus, AgentAction, RiskScore
from app.roi import Outcome, downgrade_suggestion, outcome_value_for, roi_score, value_rate
from app.schemas import (
    ActionOut,
    ActionPage,
    DowngradeSuggestion,
    FeatureROI,
    OutcomeUpdate,
)

router = APIRouter(prefix="/api")


def _feature_rows(db: Session):
    """One row per feature_tag with its spend, volume, and value counts."""
    stmt = (
        select(
            AgentAction.feature_tag.label("feature_tag"),
            func.count().label("action_count"),
            func.count()
            .filter(AgentAction.status == ActionStatus.blocked)
            .label("blocked_count"),
            func.coalesce(func.sum(AgentAction.tokens_used), 0).label("total_tokens"),
            func.coalesce(func.sum(AgentAction.estimated_cost_usd), 0.0).label("total_cost"),
            func.count()
            .filter(AgentAction.outcome.is_not(None))
            .label("judged_actions"),
            func.count()
            .filter(AgentAction.outcome == Outcome.valuable.value)
            .label("valuable_actions"),
        )
        .group_by(AgentAction.feature_tag)
        .order_by(func.sum(AgentAction.estimated_cost_usd).desc())
    )
    return db.execute(stmt).all()


@router.get("/actions", response_model=ActionPage)
def list_actions(
    db: Session = Depends(get_db),
    status: ActionStatus | None = None,
    risk_score: RiskScore | None = None,
    feature_tag: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> ActionPage:
    """Most recent actions first, with their risk, cost, and feature."""
    filters = []
    if status is not None:
        filters.append(AgentAction.status == status)
    if risk_score is not None:
        filters.append(AgentAction.risk_score == risk_score)
    if feature_tag is not None:
        filters.append(AgentAction.feature_tag == feature_tag)

    total = db.scalar(select(func.count()).select_from(AgentAction).where(*filters)) or 0

    rows = db.scalars(
        select(AgentAction)
        .where(*filters)
        .order_by(AgentAction.timestamp.desc(), AgentAction.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()

    return ActionPage(
        total=total,
        limit=limit,
        offset=offset,
        items=[ActionOut.model_validate(row) for row in rows],
    )


@router.patch("/actions/{action_id}/outcome", response_model=ActionOut)
def set_outcome(
    action_id: int,
    update: OutcomeUpdate,
    db: Session = Depends(get_db),
) -> ActionOut:
    """Mark whether an action's result was actually valuable.

    Stands in for real product analytics — for now a human sets this by hand.
    """
    action = db.get(AgentAction, action_id)
    if action is None:
        raise HTTPException(status_code=404, detail=f"No action with id {action_id}")

    action.outcome = update.outcome.value
    db.commit()
    db.refresh(action)
    return ActionOut.model_validate(action)


@router.get("/features/roi", response_model=list[FeatureROI])
def features_roi(db: Session = Depends(get_db)) -> list[FeatureROI]:
    """Per-feature spend and what it bought us. Most expensive feature first."""
    results = []
    for row in _feature_rows(db):
        unit_value = outcome_value_for(row.feature_tag)
        results.append(
            FeatureROI(
                feature_tag=row.feature_tag,
                action_count=row.action_count,
                blocked_count=row.blocked_count,
                total_tokens=row.total_tokens,
                total_cost_usd=round(row.total_cost, 8),
                judged_actions=row.judged_actions,
                valuable_actions=row.valuable_actions,
                value_rate=value_rate(row.valuable_actions, row.judged_actions),
                outcome_value_usd=unit_value,
                total_outcome_value_usd=round(row.valuable_actions * unit_value, 4),
                roi_score=roi_score(row.feature_tag, row.valuable_actions, row.total_cost),
            )
        )
    return results


@router.get("/features/{tag}/downgrade-suggestion", response_model=DowngradeSuggestion)
def feature_downgrade_suggestion(
    tag: str,
    db: Session = Depends(get_db),
) -> DowngradeSuggestion:
    """Should this feature be moved to a cheaper model?

    Needs every feature's cost, because "expensive" is relative to the others.
    """
    rows = _feature_rows(db)
    target = next((r for r in rows if r.feature_tag == tag), None)
    if target is None:
        raise HTTPException(status_code=404, detail=f"No actions logged for feature {tag!r}")

    suggestion = downgrade_suggestion(
        feature_tag=tag,
        feature_cost=target.total_cost,
        all_costs=[r.total_cost for r in rows],
        valuable_count=target.valuable_actions,
        judged_count=target.judged_actions,
    )
    return DowngradeSuggestion(**suggestion)
