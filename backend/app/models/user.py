from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(str, Enum):
    ADMIN = "admin"
    WAREHOUSE = "control"
    USER = "user"

class Status(str, Enum):
    BLOCKED = "Bloqueado"
    RELEASED = "Liberado"
    INACTIVE = "Inativo"



class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    role: Mapped[str] = mapped_column(
        String(30),
        default=UserRole.USER.value,
        nullable=False
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    cpf: Mapped[str] = mapped_column(
        String(11),
        unique=True,
        nullable=True
    )

    telefone:Mapped[str] = mapped_column(
        String(11),
        nullable=True
    )

    matricula: Mapped[str] = mapped_column(
        String(8),
        unique=True,
        nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default= Status.RELEASED.value,
        nullable=True
    )

 



    reservations = relationship(
        "Reservation",
        back_populates="user"
    )