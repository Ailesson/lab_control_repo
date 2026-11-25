"""add expected return date to reservations

Revision ID: 02d349749f50
Revises: c4ef1f0deb22
Create Date: 2026-10-28 16:31:42.722514

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '02d349749f50'
down_revision: Union[str, Sequence[str], None] = 'c4ef1f0deb22'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade():
    conn = op.get_bind()

    quantidade = conn.execute(
        sa.text("SELECT COUNT(*) FROM reservations")
    ).scalar_one()

    if quantidade != 0:
        raise RuntimeError(
            "Ainda existem reservas. Verifique os registros "
            "antes de tornar expected_return_date obrigatório."
        )

    colunas = {
        coluna["name"].lower(): coluna
        for coluna in sa.inspect(conn).get_columns("reservations")
    }

    with op.batch_alter_table(
        "reservations",
        recreate="always"
    ) as batch_op:

        if "justificativa" not in colunas:
            batch_op.add_column(
                sa.Column(
                    "justificativa",
                    sa.String(),
                    nullable=False
                )
            )

        if "obs" not in colunas:
            batch_op.add_column(
                sa.Column(
                    "Obs",
                    sa.String(),
                    nullable=True
                )
            )

        if "expected_return_date" not in colunas:
            batch_op.add_column(
                sa.Column(
                    "expected_return_date",
                    sa.DateTime(timezone=True),
                    nullable=False
                )
            )

        elif colunas["expected_return_date"]["nullable"]:
            batch_op.alter_column(
                "expected_return_date",
                existing_type=sa.DateTime(timezone=True),
                nullable=False
            )


def downgrade():
    with op.batch_alter_table(
        "reservations",
        recreate="always"
    ) as batch_op:
        batch_op.alter_column(
            "expected_return_date",
            existing_type=sa.DateTime(timezone=True),
            nullable=True
        )
        batch_op.drop_column("justificativa")
        batch_op.drop_column("Obs")

