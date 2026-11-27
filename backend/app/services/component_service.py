from fastapi import HTTPException, status, UploadFile, File
from app.services.image_service import salvar_imagem
from sqlalchemy.orm import Session


from app.models import Component, User, Reservation, ReservationStatus
from app.schemas import ComponentCreate, ComponentAvailableResponse
from app.repositories import component_repository

async def create_component(
    db: Session,
    component_data: str,
    file: UploadFile = File(...)   
):
   existing_component = component_repository.get_by_id(
      db,
      component_data.component_id
   )

   if existing_component:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Componente já registrado"
    )
   
   image_url = await salvar_imagem(file)
   
   component = Component(
       component_id=component_data.component_id,
       name = component_data.name,
       description = component_data.description,
       quantity = component_data.quantity ,
       state = component_data.state,
       obs = component_data.obs,
       image_url = image_url
   )

   return component_repository.create(db, component)

def get_by_id(
    db: Session,
    component_id: str
):
    component =  component_repository.get_by_id(db, component_id)

    if component is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Componente não encontrado"
        )
    return component

def get_all(
    db: Session
):
    components =  component_repository.get_all(db)

    if len(components)==0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Componentes não encontrados"
            )
    return components

def quantity_component_available(
    db: Session,
    component_id: str
):
    component =  component_repository.get_by_id(db, component_id)
    if component is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Componente não encontrado"
            )
    
    reservas = component.reservations

    quantity = 0

    for reserva in reservas:
        if reserva.status != ReservationStatus.RETURNED.value and reserva.status != ReservationStatus.REFUSED.value: 
            quantity += reserva.quantity

    return component.quantity-quantity

def update_quantity(
    db: Session,
    component_id: str,
    new_quantity: int
):    
    component =  component_repository.get_by_id(db, component_id)
    if component is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Componente não encontrado"
            )
    component.quantity = new_quantity
    return component_repository.update(db, component)

def get_all_available(
    db: Session
):
    components =  component_repository.get_all(db)
    components_available = []

    for component in components:
        component_available=ComponentAvailableResponse(
            component_id=component.component_id,
            name = component.name,
            description=component.description,
            quantity=quantity_component_available(db, component.component_id),
            quantity_total= component.quantity,
            image_url = component.image_url
        )
        components_available.append(component_available)

    return components_available


def delete(
    db: Session,
    component_id: str
):
    component =  component_repository.get_by_id(db, component_id)
    
    if component is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Componente não encontrado"
        )
    
    component_repository.delete(db, component)
    return {
        "detail": "Componente deletado"}