from typing import List
from fastapi import APIRouter,  Depends, status
from app.models import User
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas import UserResponse, UserCreate, UserRoleUpdate
from app.services import user_service
from app.dependencies.auth import get_current_user, require_admin, require_control

router = APIRouter(prefix ='/user', tags = ["Usuário"])

@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user)
):
    return current_user

@router.post("/",response_model=UserResponse,status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    return user_service.create_user(db, user_data)

@router.get("/", response_model= List[UserResponse], status_code=status.HTTP_200_OK)
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return user_service.get_users(db)

@router.get("/{email}", response_model=UserResponse, status_code=status.HTTP_200_OK)
def get_user_by_email(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return user_service.get_user_by_email(email, db)

@router.delete("/{email}")
def delete_user(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):

    return user_service.delete_user(email, db)

@router.patch("/{email}/role", response_model=UserResponse, status_code=status.HTTP_200_OK)
def update_permission(
    email: str,
    role_data: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return user_service.update_user_role(
        db,
        email,
        role_data.role
    )

@router.patch("/{id}/status", response_model=UserResponse, status_code=status.HTTP_200_OK)
def updateStatus(
    id: int,
    novoStatus: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
   return user_service.updateStatus(id, novoStatus, db) 
