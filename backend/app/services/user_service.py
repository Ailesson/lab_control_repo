from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import User, Status
from app.repositories import user_repository
from app.schemas import UserCreate, UserUpdate, UserRoleUpdate


def create_user(
    db: Session,
    user_data: UserCreate
):
    existing_user = user_repository.get_by_email(
        db,
        user_data.email
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email já registrado"
        )

    user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        cpf=user_data.cpf,
        matricula = user_data.matricula,
        telefone=user_data.telefone
    )

    return user_repository.create(db, user)

def get_users(
        db: Session
    ):

    users = user_repository.get_all(db)
    
    if len(users)==0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuários não encontrados"
        )

    return users

def get_user_by_email(
    email: str,
    db: Session
):
    user = user_repository.get_by_email(db, email)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    return user

def delete_user(
        email: str,
        db: Session
):

    user = user_repository.get_by_email(db, email)
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    user_repository.delete(db, user)
    return {
        "detail": "Usuário deletado"}

def update_user_role(
    db: Session,
    email: str,
    role: UserRoleUpdate
):
    user = user_repository.get_by_email(db,email)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user.role = role.value

    return user_repository.update(
        db,
        user
    )

def updateStatus(
        id: int,
        novoStatus: str,
        db: Session
):
    user = user_repository.get_by_id(db, id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if novoStatus == "Bloqueado":
        user.status = Status.BLOCKED.value
    if novoStatus == "Liberado":
        user.status = Status.RELEASED.value

    return user_repository.update(
        db,
        user
    )


def update_user(
    db: Session,
    email: str,
    user_data: UserUpdate
):
    user = user_repository.get_by_email(db,email)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    update_data = user_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(
            user,
            field,
            value
        )


    return user_repository.update(
        db,
        user
    )

