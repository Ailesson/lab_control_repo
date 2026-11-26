from typing import List
from fastapi import APIRouter,  Depends, status, UploadFile, File
from app.services.image_service import salvar_imagem
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_admin

from app.models import Component, User
from app.schemas import ComponentCreate, ComponentResponse, ComponentAvailableResponse, QuantityResponse
from app.services import component_service

router = APIRouter(prefix='/component', tags=["Componentes"])

@router.post('/', response_model=ComponentResponse, status_code=status.HTTP_201_CREATED)
def create_component(
    component: ComponentCreate,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return component_service.create_component(db, component, file)

@router.post("/upload")
async def upload_imagem(
    file: UploadFile = File(...),
    admin: User = Depends(require_admin)
):

    image_url = await salvar_imagem(file)

    return {
        "image_url": image_url
    }

@router.get("/admin", response_model=List[ComponentResponse], status_code=status.HTTP_200_OK)
def get_componentes(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return component_service.get_all(db)

@router.get("/available", response_model=List[ComponentAvailableResponse], status_code=status.HTTP_200_OK)
def get_componentes_available(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return component_service.get_all_available(db)

@router.get("/{componente_id}", response_model=ComponentResponse, status_code=status.HTTP_200_OK)
def get_by_id(
    componet_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return component_service.get_by_id(db, componet_id)



@router.delete('/{componente_id}', status_code=status.HTTP_200_OK)
def delete_component(
    component_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):

    return component_service.delete(db, component_id)

@router.get("/{component_id}/quantity", status_code=status.HTTP_200_OK)
def quantity(
    component_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return component_service.quantity_component_available(db, component_id)

@router.patch("/{component_id}/quantity", status_code=status.HTTP_200_OK)
def update_quantity(
    component_id: str,
    new_quantity: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return component_service.update_quantity(db, component_id, new_quantity)