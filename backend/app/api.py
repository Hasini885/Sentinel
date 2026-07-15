from datetime import datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.analytics import emit_outcome_event
from app.audit import log_action_event
from app.database import get_db
from app.feature_stats import feature_rows as _feature_rows
from app.feature_stats import outcome_event_totals
from app.models import (
    ActionEvent,
    ActionStatus,
    AgentAction,
    FeatureSetting,
    OutcomeEvent,
    RiskScore,
)
from app.risk_scorer import composite_score
from app.policy import load_policies, save_policies
from app.roi import (
    OUTCOME_EVENT_TO_OUTCOME,
    downgrade_suggestion,
    feature_outcome_value,
    outcome_event_value,
    outcome_value_for,
    roi_score_from_value,
    value_rate,
)
from app.schemas import (
    ActionEventOut,
    ActionOut,
    ActionPage,
    AuditRecord,
    DowngradeSuggestion,
    FeatureROI,
    FeatureSettingOut,
    FeatureSettingUpdate,
    OutcomeEventIn,
    OutcomeEventOut,
    OutcomeUpdate,
    PolicyRule,
    Summary,
)

router = APIRouter(prefix="/api")


def _require_pending(db: Session, action_id: int) -> AgentAction:
    action = db.get(AgentAction, action_id)
    if action is None:
        raise HTTPException(status_code=404, detail=f"No action with id {action_id}")
    if action.status is not ActionStatus.pending_approval:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Action {action_id} is {action.status.value}, not pending_approval — "
                "there is nothing to decide."
            ),
        )
    return action


@router.get("/summary", response_model=Summary)
def summary(db: Session = Depends(get_db)) -> Summary:
    """Headline numbers for the dashboard's top bar."""
    start_of_today = datetime.combine(datetime.now(timezone.utc).date(), time.min, timezone.utc)
    today = AgentAction.timestamp >= start_of_today

    total_today = db.scalar(select(func.count()).select_from(AgentAction).where(today)) or 0
    blocked_today = (
        db.scalar(
            select(func.count())
            .select_from(AgentAction)
            .where(today, AgentAction.status == ActionStatus.blocked)
        )
        or 0
    )
    cost_today = (
        db.scalar(
            select(func.coalesce(func.sum(AgentAction.estimated_cost_usd), 0.0)).where(today)
        )
        or 0.0
    )
    cost_all_time = (
        db.scalar(select(func.coalesce(func.sum(AgentAction.estimated_cost_usd), 0.0))) or 0.0
    )

    return Summary(
        total_actions_today=total_today,
        blocked_today=blocked_today,
        blocked_pct_today=round(100 * blocked_today / total_today, 1) if total_today else 0.0,
        total_cost_usd_today=round(cost_today, 8),
        total_cost_usd_all_time=round(cost_all_time, 8),
    )


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
    log_action_event(db, action.id, "outcome_marked", {
        "outcome": update.outcome.value,
        "marked_by": "dashboard",  # no auth yet — every actor is the dashboard
    })
    db.commit()
    db.refresh(action)
    return ActionOut.model_validate(action)


@router.get("/actions/{action_id}/audit", response_model=AuditRecord)
def action_audit(action_id: int, db: Session = Depends(get_db)) -> AuditRecord:
    """The complete decision history for one action — the governance centerpiece.

    Combines the current action record (payload, risk factors, model, status),
    the append-only action_events trail (scoring, policy decision, approvals),
    and any recorded outcome events. Actions that predate the audit log return
    an empty events list but still carry the full record.
    """
    action = db.get(AgentAction, action_id)
    if action is None:
        raise HTTPException(status_code=404, detail=f"No action with id {action_id}")

    events = db.scalars(
        select(ActionEvent)
        .where(ActionEvent.action_id == action_id)
        .order_by(ActionEvent.created_at, ActionEvent.id)
    ).all()
    outcome_events = db.scalars(
        select(OutcomeEvent)
        .where(OutcomeEvent.action_id == action_id)
        .order_by(OutcomeEvent.created_at, OutcomeEvent.id)
    ).all()

    composite = (
        round(
            composite_score(
                action.data_sensitivity, action.external_exposure, action.reversibility
            ),
            2,
        )
        if action.data_sensitivity is not None
        and action.external_exposure is not None
        and action.reversibility is not None
        else None
    )

    return AuditRecord(
        action=ActionOut.model_validate(action),
        composite_score=composite,
        events=[ActionEventOut.model_validate(e) for e in events],
        outcome_events=[OutcomeEventOut.model_validate(e) for e in outcome_events],
    )


@router.post(
    "/actions/{action_id}/outcome-event", response_model=OutcomeEventOut, status_code=201
)
def record_outcome_event(
    action_id: int,
    body: OutcomeEventIn,
    db: Session = Depends(get_db),
) -> OutcomeEventOut:
    """Record a downstream product outcome for an action and mirror it to PostHog.

    Still triggered manually for now, but it flows through real analytics
    infrastructure: the event lands in outcome_events (source of truth for ROI)
    and is emitted to PostHog linked by action_id. The legacy per-action
    `outcome` judgement is kept in sync so the downgrade heuristic still works.
    """
    action = db.get(AgentAction, action_id)
    if action is None:
        raise HTTPException(status_code=404, detail=f"No action with id {action_id}")

    event = OutcomeEvent(
        action_id=action.id,
        event_type=body.event_type,
        value_usd=outcome_event_value(body.event_type),
    )
    db.add(event)
    action.outcome = OUTCOME_EVENT_TO_OUTCOME[body.event_type].value
    log_action_event(db, action.id, "outcome_recorded", {
        "outcome": body.event_type,
        "value_usd": outcome_event_value(body.event_type),
        "recorded_by": "dashboard",
    })
    db.commit()
    db.refresh(event)

    emit_outcome_event(
        agent_name=action.agent_name,
        action_id=action.id,
        feature_tag=action.feature_tag,
        event_type=event.event_type,
        value_usd=event.value_usd,
    )
    return OutcomeEventOut.model_validate(event)


@router.post("/actions/{action_id}/approve", response_model=ActionOut)
def approve_action(action_id: int, db: Session = Depends(get_db)) -> ActionOut:
    """Release a held action.

    Note this records the human decision — it does not re-run the underlying tool.
    The interceptor raised at call time, so the agent already moved on. Replaying the
    side effect needs a deferred execution queue, which we haven't built.
    """
    action = _require_pending(db, action_id)
    action.status = ActionStatus.executed
    log_action_event(db, action.id, "approved", {"decided_by": "dashboard"})
    db.commit()
    db.refresh(action)
    return ActionOut.model_validate(action)


@router.post("/actions/{action_id}/reject", response_model=ActionOut)
def reject_action(action_id: int, db: Session = Depends(get_db)) -> ActionOut:
    """Deny a held action. It stays unexecuted and is recorded as blocked."""
    action = _require_pending(db, action_id)
    action.status = ActionStatus.blocked
    log_action_event(db, action.id, "rejected", {"decided_by": "dashboard"})
    db.commit()
    db.refresh(action)
    return ActionOut.model_validate(action)


@router.get("/policies", response_model=list[PolicyRule])
def get_policies() -> list[PolicyRule]:
    return [PolicyRule(**rule) for rule in load_policies()]


@router.put("/policies", response_model=list[PolicyRule])
def put_policies(policies: list[PolicyRule]) -> list[PolicyRule]:
    """Replace the whole rule set.

    One rule per action_type: the engine takes the first match, so two rules on the
    same action would make the second unreachable depending on list order.
    """
    seen: set[str] = set()
    duplicates = {r.action_type for r in policies if r.action_type in seen or seen.add(r.action_type)}
    if duplicates:
        raise HTTPException(
            status_code=422,
            detail=f"Duplicate rules for action_type(s): {', '.join(sorted(duplicates))}",
        )

    save_policies([rule.model_dump(mode="json") for rule in policies])
    return policies


@router.get("/features/settings", response_model=list[FeatureSettingOut])
def list_feature_settings(db: Session = Depends(get_db)) -> list[FeatureSettingOut]:
    """Every feature that has ever had its settings touched. Features without a
    row behave as auto_downgrade_enabled=False."""
    rows = db.scalars(select(FeatureSetting).order_by(FeatureSetting.feature_tag)).all()
    return [FeatureSettingOut.model_validate(row) for row in rows]


@router.put("/features/{tag}/settings", response_model=FeatureSettingOut)
def put_feature_setting(
    tag: str,
    update: FeatureSettingUpdate,
    db: Session = Depends(get_db),
) -> FeatureSettingOut:
    """Turn auto-downgrade on or off for a feature (creates the row on first use)."""
    setting = db.get(FeatureSetting, tag)
    if setting is None:
        setting = FeatureSetting(feature_tag=tag)
        db.add(setting)
    setting.auto_downgrade_enabled = update.auto_downgrade_enabled
    db.commit()
    db.refresh(setting)
    return FeatureSettingOut.model_validate(setting)


@router.get("/features/roi", response_model=list[FeatureROI])
def features_roi(db: Session = Depends(get_db)) -> list[FeatureROI]:
    """Per-feature spend and what it bought us. Most expensive feature first.

    Outcome value is derived from recorded outcome events where they exist,
    falling back to the flat per-valuable-action credit for features that have
    no analytics coverage yet.
    """
    event_totals = outcome_event_totals(db)
    results = []
    for row in _feature_rows(db):
        event_count, event_value_sum = event_totals.get(row.feature_tag, (0, 0.0))
        total_value = feature_outcome_value(
            row.feature_tag, row.valuable_actions, event_value_sum, event_count
        )
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
                outcome_value_usd=outcome_value_for(row.feature_tag),
                total_outcome_value_usd=round(total_value, 4),
                roi_score=roi_score_from_value(total_value, row.total_cost),
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
