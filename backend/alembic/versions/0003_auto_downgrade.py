"""feature_settings table + model_used/downgraded on agent_actions

Revision ID: 0003_auto_downgrade
Revises: 0002_multi_factor_risk
Create Date: 2026-07-12

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_auto_downgrade"
down_revision: Union[str, None] = "0002_multi_factor_risk"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "feature_settings",
        sa.Column("feature_tag", sa.String(length=255), nullable=False),
        sa.Column(
            "auto_downgrade_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("feature_tag"),
    )

    op.add_column("agent_actions", sa.Column("model_used", sa.String(length=100), nullable=True))
    op.add_column(
        "agent_actions",
        sa.Column("downgraded", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("agent_actions", "downgraded")
    op.drop_column("agent_actions", "model_used")
    op.drop_table("feature_settings")
