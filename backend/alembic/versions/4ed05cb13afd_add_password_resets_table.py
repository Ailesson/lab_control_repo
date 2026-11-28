"""add password resets table

Revision ID: 4ed05cb13afd
Revises: ec3a86050853
Create Date: 2026-11-27 15:04:33.646098

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4ed05cb13afd'
down_revision: Union[str, Sequence[str], None] = 'ec3a86050853'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    op.create_table(
        "password_resets",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False
        ),

        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False
        ),

        sa.Column(
            "token_hash",
            sa.String(length=64),
            nullable=False
        ),

        sa.Column(
            "expires_at",
            sa.DateTime(),
            nullable=False
        ),

        sa.Column(
            "used",
            sa.Boolean(),
            nullable=False
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False
        ),

        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE"
        ),

        sa.PrimaryKeyConstraint("id")
    )

    op.create_index(
        "ix_password_resets_id",
        "password_resets",
        ["id"],
        unique=False
    )

    op.create_index(
        "ix_password_resets_token_hash",
        "password_resets",
        ["token_hash"],
        unique=True
    )

    op.create_index(
        "ix_password_resets_user_id",
        "password_resets",
        ["user_id"],
        unique=False
    )


def downgrade() -> None:

    op.drop_index(
        "ix_password_resets_user_id",
        table_name="password_resets"
    )

    op.drop_index(
        "ix_password_resets_token_hash",
        table_name="password_resets"
    )

    op.drop_index(
        "ix_password_resets_id",
        table_name="password_resets"
    )

    op.drop_table("password_resets")