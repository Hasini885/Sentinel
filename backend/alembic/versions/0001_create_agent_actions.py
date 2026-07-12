"""create agent_actions table

Revision ID: 0001_agent_actions
Revises:
Create Date: 2026-07-12

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_agent_actions"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_actions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("agent_name", sa.String(length=255), nullable=False),
        sa.Column("action_type", sa.String(length=255), nullable=False),
        sa.Column("action_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "risk_score",
            sa.Enum("low", "medium", "high", name="risk_score"),
            nullable=False,
        ),
        sa.Column("risk_reason", sa.Text(), nullable=False),
        sa.Column("feature_tag", sa.String(length=255), nullable=False),
        sa.Column("tokens_used", sa.Integer(), nullable=False),
        sa.Column("estimated_cost_usd", sa.Float(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("executed", "blocked", "pending_approval", name="action_status"),
            nullable=False,
        ),
        sa.Column("outcome", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agent_actions_timestamp", "agent_actions", ["timestamp"])
    op.create_index("ix_agent_actions_agent_name", "agent_actions", ["agent_name"])
    op.create_index("ix_agent_actions_action_type", "agent_actions", ["action_type"])
    op.create_index("ix_agent_actions_feature_tag", "agent_actions", ["feature_tag"])


def downgrade() -> None:
    op.drop_index("ix_agent_actions_feature_tag", table_name="agent_actions")
    op.drop_index("ix_agent_actions_action_type", table_name="agent_actions")
    op.drop_index("ix_agent_actions_agent_name", table_name="agent_actions")
    op.drop_index("ix_agent_actions_timestamp", table_name="agent_actions")
    op.drop_table("agent_actions")
    sa.Enum(name="action_status").drop(op.get_bind(), checkfirst=False)
    sa.Enum(name="risk_score").drop(op.get_bind(), checkfirst=False)
