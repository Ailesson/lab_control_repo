from typing import List

from fastapi import APIRouter,  Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_admin

from app.schemas import ReservationCreate, ReservationResponse
from app.models import User
from app.services import reservation_service


router = APIRouter(prefix='/reservation', tags=["Reservas"])


@router.post("/", response_model = ReservationResponse, status_code=status.HTTP_201_CREATED)
def create_reservation(
    reservation_data: ReservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return reservation_service.create_reservation(db, reservation_data, current_user)

@router.get("/", response_model=List[ReservationResponse], status_code=status.HTTP_200_OK)
def get_reservetions_current_user(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return reservation_service.get_reservetions_current_user(db,current_user)

@router.get("/admin", response_model=List[ReservationResponse], status_code=status.HTTP_200_OK)
def get_reservetions(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return reservation_service.get_reservations(db)

@router.patch("/devolution", response_model=ReservationResponse, status_code= status.HTTP_200_OK)
def devolution(
    reservation_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
   return reservation_service.devolution(db, reservation_id)

@router.patch("/status", response_model=ReservationResponse, status_code= status.HTTP_200_OK)
def status(
    reservation_id: int,
    status: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return reservation_service.status(db, reservation_id, status)