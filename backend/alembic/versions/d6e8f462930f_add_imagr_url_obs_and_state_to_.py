
"""add image_url, obs and state to components

Revision ID: d6e8f462930f
Revises: af7fa60f0d55
Create Date: 2026-11-05 09:37:40.714218
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d6e8f462930f"
down_revision: Union[str, Sequence[str], None] = "af7fa60f0d55"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Adiciona os campos sem recriar colunas existentes."""

    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Colunas que já existem em components
    colunas = {
        coluna["name"]
        for coluna in inspector.get_columns("components")
    }

    # Adiciona somente as colunas ausentes
    if "state" not in colunas:
        op.add_column(
            "components",
            sa.Column("state", sa.String(255), nullable=True)
        )

    if "obs" not in colunas:
        op.add_column(
            "components",
            sa.Column("obs", sa.String(255), nullable=True)
        )

    if "image_url" not in colunas:
        op.add_column(
            "components",
            sa.Column("image_url", sa.String(255), nullable=True)
        )

    # Recuperação de índices que podem ter sido
    # removidos pela tentativa anterior de migração.
    # Não altera colunas ou dados da tabela users.
    indices = {
        indice["name"]
        for indice in sa.inspect(conn).get_indexes("users")
    }

    if "ux_users_cpf" not in indices:
        op.create_index(
            "ux_users_cpf",
            "users",
            ["cpf"],
            unique=True
        )

    if "ux_users_matricula" not in indices:
        op.create_index(
            "ux_users_matricula",
            "users",
            ["matricula"],
            unique=True
        )


def downgrade() -> None:
    """Reverte apenas os campos desta revisão."""

    conn = op.get_bind()

    colunas = {
        coluna["name"]
        for coluna in sa.inspect(conn).get_columns("components")
    }

    # Batch mode permite remover colunas no SQLite.
    with op.batch_alter_table("components") as batch_op:

        if "image_url" in colunas:
            batch_op.drop_column("image_url")

        if "obs" in colunas:
            batch_op.drop_column("obs")

        if "state" in colunas:
            batch_op.drop_column("state")

    # Os índices de users pertencem à revisão anterior.
    # Portanto, não são removidos aqui.
