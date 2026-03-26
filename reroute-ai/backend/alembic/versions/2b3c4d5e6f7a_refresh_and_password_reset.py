"""refresh_tokens, user oauth columns, password_reset_tokens

Revision ID: 2b3c4d5e6f7a
Revises: 1fa1c26ec5be
Create Date: 2026-03-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "2b3c4d5e6f7a"
down_revision: Union[str, Sequence[str], None] = "1fa1c26ec5be"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = set(insp.get_table_names())

    if "refresh_tokens" not in tables:
        op.create_table(
            "refresh_tokens",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("token_hash", sa.String(length=64), nullable=False),
            sa.Column("family_id", sa.String(length=36), nullable=False),
            sa.Column("remember_me", sa.Boolean(), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_refresh_tokens_user_id"), "refresh_tokens", ["user_id"], unique=False)
        op.create_index(op.f("ix_refresh_tokens_token_hash"), "refresh_tokens", ["token_hash"], unique=True)
        op.create_index(op.f("ix_refresh_tokens_family_id"), "refresh_tokens", ["family_id"], unique=False)

    insp = sa.inspect(bind)
    ucols = {c["name"] for c in insp.get_columns("users")} if "users" in set(insp.get_table_names()) else set()
    if "google_sub" not in ucols:
        op.add_column("users", sa.Column("google_sub", sa.String(length=255), nullable=True))
    if "avatar_url" not in ucols:
        op.add_column("users", sa.Column("avatar_url", sa.String(length=512), nullable=True))

    try:
        op.alter_column(
            "users",
            "password_hash",
            existing_type=sa.String(length=255),
            nullable=True,
        )
    except Exception:
        pass

    if bind.dialect.name == "postgresql":
        op.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_sub ON users (google_sub) "
            "WHERE google_sub IS NOT NULL"
        )
    else:
        try:
            op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=True)
        except Exception:
            pass

    insp = sa.inspect(bind)
    if "password_reset_tokens" not in set(insp.get_table_names()):
        op.create_table(
            "password_reset_tokens",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("token_hash", sa.String(length=64), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_password_reset_tokens_user_id"), "password_reset_tokens", ["user_id"], unique=False
        )
        op.create_index(
            op.f("ix_password_reset_tokens_token_hash"),
            "password_reset_tokens",
            ["token_hash"],
            unique=True,
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_users_google_sub")
    else:
        try:
            op.drop_index("ix_users_google_sub", table_name="users")
        except Exception:
            pass
    try:
        op.drop_column("users", "avatar_url")
    except Exception:
        pass
    try:
        op.drop_column("users", "google_sub")
    except Exception:
        pass
    try:
        op.alter_column(
            "users",
            "password_hash",
            existing_type=sa.String(length=255),
            nullable=False,
        )
    except Exception:
        pass
    try:
        op.drop_table("password_reset_tokens")
    except Exception:
        pass
    try:
        op.drop_table("refresh_tokens")
    except Exception:
        pass
