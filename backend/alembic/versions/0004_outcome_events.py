"""create outcome_events table

Revision ID: 0004_outcome_events
Revises: 0003_auto_downgrade
Create Date: 2026-07-12

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_outcome_events"
down_revision: Union[str, None] = "0003_auto_downgrade"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "outcome_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("action_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("value_usd", sa.Float(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["action_id"], ["agent_actions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_outcome_events_action_id", "outcome_events", ["action_id"])


def downgrade() -> None:
    op.drop_index("ix_outcome_events_action_id", table_name="outcome_events")
    op.drop_table("outcome_events")
