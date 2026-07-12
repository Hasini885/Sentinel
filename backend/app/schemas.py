from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models import ActionStatus, RiskScore
from app.roi import Outcome


class ActionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    agent_name: str
    action_type: str
    action_payload: dict
    risk_score: RiskScore
    risk_reason: str
    feature_tag: str
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
