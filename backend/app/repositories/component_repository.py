from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Component


def get_all(db: Session):
    return db.scalars(
        select(Component)
    ).all()

def get_by_id(db: Session, component_id: str):
    return db.scalar(
        select(Component).where(Component.component_id == component_id)
        )



def create(db: Session, component: Component):
    db.add(component)
    db.commit()
    db.refresh(component)

    return component


def delete(db: Session, component: Component):
    db.delete(component)
    db.commit()

def update(db: Session, component: Component):
    db.commit()
    db.refresh(component)
    
    return component