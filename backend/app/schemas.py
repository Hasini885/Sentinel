from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models import ActionStatus, RiskScore
from app.roi import Outcome


class PolicyRule(BaseModel):
    """One JSON policy rule. Unknown keys are rejected — a typo'd field name would
    otherwise be silently ignored and the rule would quietly not do what it says."""

    model_config = ConfigDict(extra="forbid")

    action_type: str = Field(min_length=1)
    risk_threshold: RiskScore
    on_breach: Literal["block", "require_approval"]


class ActionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    agent_name: str
    action_type: str
    action_payload: dict
    risk_score: RiskScore
    risk_reason: str
    data_sensitivity: int | None
    external_exposure: int | None
    reversibility: int | None
    factor_reasoning: dict[str, str] | None
    feature_tag: str
    model_used: str | None
    downgraded: bool
    tokens_used: int
    estimated_cost_usd: float
    status: ActionStatus
    outcome: str | None


class ActionPage(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[ActionOut]


class OutcomeUpdate(BaseModel):
    outcome: Outcome


class ActionEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_type: str
    detail: dict | None
    created_at: datetime


class OutcomeEventIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_type: Literal["retained", "converted", "abandoned"]


class OutcomeEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action_id: int
    event_type: str
    value_usd: float
    created_at: datetime


class AuditRecord(BaseModel):
    """The complete decision history for one action.

    `events` is the immutable append-only trail (chronological). The action and
    outcome_events blocks are included in full so actions that predate the audit
    log still show their payload, factors, model, and outcomes.
    """

    action: ActionOut
    composite_score: float | None
    events: list[ActionEventOut]
    outcome_events: list[OutcomeEventOut]


class FeatureSettingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    feature_tag: str
    auto_downgrade_enabled: bool
    updated_at: datetime


class FeatureSettingUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    auto_downgrade_enabled: bool


class Summary(BaseModel):
    """Top-bar stats. Scoped to today (UTC) so the numbers mean something at a glance."""

    total_actions_today: int
    blocked_today: int
    blocked_pct_today: float
    total_cost_usd_today: float
    total_cost_usd_all_time: float


class FeatureROI(BaseModel):
    feature_tag: str
    action_count: int
    blocked_count: int
    total_tokens: int
    total_cost_usd: float
    judged_actions: int
    valuable_actions: int
    value_rate: float | None
    outcome_value_usd: float
    total_outcome_value_usd: float
    roi_score: float | None


class DowngradeSuggestion(BaseModel):
    feature_tag: str
    suggest_downgrade: bool
    suggested_model: str | None
    reason: str
    total_cost_usd: float
    cost_percentile: float
    value_rate: float | None
    judged_actions: int
    valuable_actions: int
    roi_score: float | None
