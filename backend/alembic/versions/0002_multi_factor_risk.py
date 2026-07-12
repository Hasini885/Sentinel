"""add multi-factor risk sub-score columns

Revision ID: 0002_multi_factor_risk
Revises: 0001_agent_actions
Create Date: 2026-07-12

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_multi_factor_risk"
down_revision: Union[str, None] = "0001_agent_actions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("agent_actions", sa.Column("data_sensitivity", sa.Integer(), nullable=True))
    op.add_column("agent_actions", sa.Column("external_exposure", sa.Integer(), nullable=True))
    op.add_column("agent_actions", sa.Column("reversibility", sa.Integer(), nullable=True))
    op.add_column(
        "agent_actions",
        sa.Column("factor_reasoning", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("agent_actions", "factor_reasoning")
    op.drop_column("agent_actions", "reversibility")
    op.drop_column("agent_actions", "external_exposure")
    op.drop_column("agent_actions", "data_sensitivity")
