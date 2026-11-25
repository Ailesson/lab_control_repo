from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

class Component(Base):
    __tablename__ = "components"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
 
    component_id: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        index=True,
        nullable=False
    )

    description: Mapped[str] = mapped_column(
        String(255),
        nullable= False
    )

    quantity: Mapped[int] = mapped_column(
        nullable= False
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

    state: Mapped[str] = mapped_column(
            String(255),
            nullable= True
        )

    obs: Mapped[str] = mapped_column(
            String(255),
            nullable= True
        )

    image_url: Mapped[str | None] = mapped_column(
            String(255),
            nullable=True,
            default=None
        )

    reservations = relationship(
        "Reservation",
        back_populates="component"
    )