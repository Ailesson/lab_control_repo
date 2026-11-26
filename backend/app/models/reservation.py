from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Integer, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

class ReservationStatus(str, Enum):
    BORROWED= "confirmado"
    LATE = "atraso"
    RESERVED = "reservado"
    RETURNED = "devolvido"
    BLOCKED= "bloqueado"
    REFUSED= "recusado"


class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    component_id: Mapped[int] = mapped_column(
        ForeignKey("components.id"),
        nullable=False
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    loan_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    return_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default= None,
        nullable=True
    )

    expected_return_date: Mapped[datetime | None] = mapped_column(
            DateTime(timezone=True),
            nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default= ReservationStatus.RESERVED.value,
        nullable=False
    )

    justificativa: Mapped[str]= mapped_column(
        String(255),
        nullable=False
    )

    Obs: Mapped[str]= mapped_column(
            String(255),
            nullable=True
    )


    user = relationship(
        "User",
        back_populates="reservations"
    )


    component = relationship(
        "Component",
        back_populates="reservations"
    )

    @property
    def component_code(self) -> int:
        return self.component.component_id

    @property
    def component_name(self) -> str:
        return self.component.name
    
    @property
    def user_name(self) -> str:
        return self.user.name

    @property
    def user_matricula(self) -> str:
            return self.user.matricula