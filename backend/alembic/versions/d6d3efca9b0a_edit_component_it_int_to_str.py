
"""Alterar component_id de Integer para String(20).

Revision ID: d6d3efca9b0a
Revises: d6e8f462930f
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d6d3efca9b0a"
down_revision: Union[str, Sequence[str], None] = "d6e8f462930f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Converte o código público do equipamento para texto."""

    with op.batch_alter_table(
        "components",
        recreate="always"
    ) as batch_op:

        batch_op.alter_column(
            "component_id",
            existing_type=sa.Integer(),
            type_=sa.String(length=20),
            existing_nullable=False
        )


def downgrade() -> None:
    """Reverte para inteiro somente se os códigos permitirem."""

    conn = op.get_bind()

    codigos = conn.execute(
        sa.text("SELECT component_id FROM components")
    ).scalars()

    if any(
        not str(codigo).isdigit() for codigo in codigos
    ):
        raise RuntimeError(
            "Não é possível reverter: existem códigos "
            "de patrimônio não numéricos."
        )

    with op.batch_alter_table(
        "components",
        recreate="always"
    ) as batch_op:

        batch_op.alter_column(
            "component_id",
            existing_type=sa.String(length=20),
            type_=sa.Integer(),
            existing_nullable=False
        )
