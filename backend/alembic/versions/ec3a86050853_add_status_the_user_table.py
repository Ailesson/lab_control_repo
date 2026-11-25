
"""add status to User table

Revision ID: ec3a86050853
Revises: d6d3efca9b0a
Create Date: 2026-11-05 12:41:44.120436
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "ec3a86050853"
down_revision: Union[str, Sequence[str], None] = "d6d3efca9b0a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Adiciona o campo status à tabela users."""

    conn = op.get_bind()

    colunas = {
        coluna["name"]
        for coluna in sa.inspect(conn).get_columns("users")
    }

    if "status" not in colunas:
        op.add_column(
            "users",
            sa.Column(
                "status",
                sa.String(length=20),
                nullable=True
            )
        )


def downgrade() -> None:
    """Remove o campo status da tabela users."""

    conn = op.get_bind()

    colunas = {
        coluna["name"]
        for coluna in sa.inspect(conn).get_columns("users")
    }

    if "status" in colunas:
        with op.batch_alter_table("users") as batch_op:
            batch_op.drop_column("status")
