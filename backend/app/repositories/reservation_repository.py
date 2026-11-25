from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Reservation


def get_all(db: Session):
    return db.scalars(
        select(Reservation)
    ).all()

def get_by_id(db: Session, reservation_id: int):
    return db.get(Reservation, reservation_id)



def create(db: Session, reservation: Reservation):
    db.add(reservation)
    db.commit()
    db.refresh(reservation)

    return reservation


def delete(db: Session, reservation: Reservation):
    db.delete(reservation)
    db.commit()

def update(db: Session, reservation: Reservation):
    db.commit()
    db.refresh(reservation)
    
    return reservation