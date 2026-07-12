from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import ActionStatus, AgentAction
from app.roi import Outcome


def feature_rows(db: Session):
    """One row per feature_tag with its spend, volume, and value counts.

    Shared by the ROI endpoints and the model router — both need the same
    aggregates to run the downgrade heuristic.
    """
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
