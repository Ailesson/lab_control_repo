"""add cpf, matricula e telefone em user

Revision ID: af7fa60f0d55
Revises: 02d349749f50
Create Date: 2026-10-29 09:38:40.419505

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'af7fa60f0d55'
down_revision: Union[str, Sequence[str], None] = '02d349749f50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


from sqlalchemy import inspect


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    colunas = {
        coluna["name"]
        for coluna in inspector.get_columns("users")
    }

    indices = {
        indice["name"]
        for indice in inspector.get_indexes("users")
    }

    # 1. CPF
    if "cpf" not in colunas:
        op.add_column(
            "users",
            sa.Column(
                "cpf",
                sa.String(11),
                nullable=True
            )
        )

    # 2. Matrícula
    if "matricula" not in colunas:
        op.add_column(
            "users",
            sa.Column(
                "matricula",
                sa.String(20),
                nullable=True
            )
        )

    # 3. Telefone
    if "telefone" not in colunas:
        op.add_column(
            "users",
            sa.Column(
                "telefone",
                sa.String(20),
                nullable=True
            )
        )

    # 4. CPF único
    if "ux_users_cpf" not in indices:
        op.create_index(
            "ux_users_cpf",
            "users",
            ["cpf"],
            unique=True
        )

    # 5. Matrícula única
    if "ux_users_matricula" not in indices:
        op.create_index(
            "ux_users_matricula",
            "users",
            ["matricula"],
            unique=True
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    indices = {
        indice["name"]
        for indice in inspector.get_indexes("users")
    }

    if "ux_users_matricula" in indices:
        op.drop_index(
            "ux_users_matricula",
            table_name="users"
        )

    if "ux_users_cpf" in indices:
        op.drop_index(
            "ux_users_cpf",
            table_name="users"
        )

    colunas = {
        coluna["name"]
        for coluna in sa.inspect(conn).get_columns("users")
    }

    with op.batch_alter_table("users") as batch_op:
        for nome in ("matricula", "telefone", "cpf"):
            if nome in colunas:
                batch_op.drop_column(nome)
