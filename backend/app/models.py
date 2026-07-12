import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RiskScore(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class ActionStatus(str, enum.Enum):
    executed = "executed"
    blocked = "blocked"
    pending_approval = "pending_approval"


class AgentAction(Base):
    """A single intercepted agent action: what it did, how risky it was, what it cost."""

    __tablename__ = "agent_actions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    agent_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    action_type: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    action_payload: Mapped[dict] = mapped_column(JSONB, nullable=False)

    risk_score: Mapped[RiskScore] = mapped_column(
        Enum(RiskScore, name="risk_score", native_enum=True),
        nullable=False,
    )
    risk_reason: Mapped[str] = mapped_column(Text, nullable=False)

    # Multi-factor sub-scores (0-10). Nullable: rows predating Phase 7, and rows
    # where scoring failed and we fell back to a blanket high, have no factors.
    data_sensitivity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    external_exposure: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reversibility: Mapped[int | None] = mapped_column(Integer, nullable=True)
    factor_reasoning: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    feature_tag: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    # Which model actually scored this action, and whether the router downgraded
    # it from the default. Nullable model_used: rows predate the model router.
    model_used: Mapped[str | None] = mapped_column(String(100), nullable=True)
    downgraded: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    tokens_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estimated_cost_usd: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    status: Mapped[ActionStatus] = mapped_column(
        Enum(ActionStatus, name="action_status", native_enum=True),
        nullable=False,
    )
    outcome: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return (
            f"<AgentAction id={self.id} agent={self.agent_name!r} "
            f"action={self.action_type!r} risk={self.risk_score} status={self.status}>"
        )


class OutcomeEvent(Base):
    """A downstream product outcome (converted/retained/abandoned) attributed to
    one agent action. value_usd is snapshotted at recording time so later tuning
    of the value mapping doesn't silently rewrite historical ROI."""

    __tablename__ = "outcome_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    action_id: Mapped[int] = mapped_column(
        ForeignKey("agent_actions.id"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    value_usd: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    def __repr__(self) -> str:
        return (
            f"<OutcomeEvent id={self.id} action_id={self.action_id} "
            f"type={self.event_type!r} value=${self.value_usd}>"
        )


class FeatureSetting(Base):
    """Per-feature operator knobs. Today just the auto-downgrade opt-in.

    A feature with no row behaves exactly like auto_downgrade_enabled=False —
    nothing downgrades unless someone explicitly turned it on.
    """

    __tablename__ = "feature_settings"

    feature_tag: Mapped[str] = mapped_column(String(255), primary_key=True)
    auto_downgrade_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    def __repr__(self) -> str:
        return (
            f"<FeatureSetting feature={self.feature_tag!r} "
            f"auto_downgrade={self.auto_downgrade_enabled}>"
        )
