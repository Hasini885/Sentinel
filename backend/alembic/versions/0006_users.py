"""create users table and seed the demo account

Revision ID: 0006_users
Revises: 0005_action_events
Create Date: 2026-07-21

Adds the only place accounts live. A new table — no existing table, column, or
endpoint is touched. Seeds the documented demo login (demo@sentinel.local /
sentinel-demo) so it keeps working after auth moves off the in-memory store.
"""
from typing import Sequence, Union

import bcrypt
import sqlalchemy as sa
from alembic import op

revision: str = "0006_users"
down_revision: Union[str, None] = "0005_action_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEMO_EMAIL = "demo@sentinel.local"
DEMO_NAME = "Demo Operator"
DEMO_PASSWORD = "sentinel-demo"


def upgrade() -> None:
    users = op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # Hash is computed here rather than hardcoded, so the seed is always a valid
    # bcrypt hash of the known demo password with a fresh salt.
    demo_hash = bcrypt.hashpw(DEMO_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    op.bulk_insert(
        users,
        [{"email": DEMO_EMAIL, "name": DEMO_NAME, "password_hash": demo_hash}],
    )


def downgrade() -> None:
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
