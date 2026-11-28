from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User


def get_all(db: Session):
    return db.scalars(
        select(User)
    ).all()

def get_by_id(db: Session, user_id: int):
    return db.get(User, user_id)


def get_by_email(db: Session, email: str):
    return db.scalar(
        select(User).where(User.email == email)
    )

def get_by_cpf(db: Session, cpf: str):
    return db.scalar(
       select(User).where(User.cpf == cpf) 
    )


def create(db: Session, user: User):
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def delete(db: Session, user: User):
    db.delete(user)
    db.commit()

def update(db: Session, user: User):
    db.commit()
    db.refresh(user)

    return user
