from datetime import datetime, timezone, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Reservation, User, ReservationStatus
from app.schemas import ReservationCreate, ReservationResponse
from app.repositories import reservation_repository, component_repository
from app.services import component_service


def create_reservation(
    db: Session,
    reservation_data: ReservationCreate,
    current_user: User
):
    
    quantity = component_service.quantity_component_available(db, reservation_data.component_id)

    if quantity < reservation_data.quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Quantidade solicitada maior do que em estoque!"
        ) 

    component = component_repository.get_by_id(db, reservation_data.component_id)

    loan_date = datetime.now(timezone.utc)

    reservation = Reservation(
        user_id = current_user.id,
        component_id = component.id,
        quantity= reservation_data.quantity,
        loan_date = loan_date,
        expected_return_date = reservation_data.expected_return_date,
        justificativa = reservation_data.justificativa,
        Obs = reservation_data.Obs,
        user_name = current_user.name,
        user_matricula = current_user.matricula
    )

    return reservation_repository.create(db, reservation)

def get_reservetions_current_user(
    db: Session,
    current_user: User
):
    reservation=current_user.reservations



    if reservation is None:
        raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reservas não encontrados"
        )
    return reservation



def get_reservations(
    db: Session
):
    reservations = reservation_repository.get_all(db)

    if reservations is None:
        raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reservas não encontrados"
        )

    return reservations

def devolution(
    db: Session,
    reservation_id: int    
):
    reservation = reservation_repository.get_by_id(db, reservation_id)

    if reservation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reserva não encontrada"
        )

    reservation.status = ReservationStatus.RETURNED.value

    return reservation_repository.update(db, reservation)

def status(
    db: Session,
    reservation_id: int,
    novo_status: str    
):
    reservation = reservation_repository.get_by_id(db, reservation_id)

    if reservation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reserva não encontrada"
        )

    if novo_status =="Aprovar":
        reservation.status = ReservationStatus.BORROWED.value

    if novo_status =="Recusar":
            reservation.status = ReservationStatus.REFUSED.value

    if novo_status =="Bloquear":
            reservation.status = ReservationStatus.BLOCKED.value

    return reservation_repository.update(db, reservation)

