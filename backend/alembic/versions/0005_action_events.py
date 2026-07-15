"""create action_events audit-trail table

Revision ID: 0005_action_events
Revises: 0004_outcome_events
Create Date: 2026-07-12

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_action_events"
down_revision: Union[str, None] = "0004_outcome_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "action_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("action_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("detail", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["action_id"], ["agent_actions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_action_events_action_id", "action_events", ["action_id"])


def downgrade() -> None:
    op.drop_index("ix_action_events_action_id", table_name="action_events")
    op.drop_table("action_events")
