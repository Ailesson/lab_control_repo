from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import User, Status, PasswordReset
from app.repositories import user_repository, password_reset_repository
from app.schemas import UserCreate, UserUpdate, UserRoleUpdate, RedefinirSenha
from app.services import email_service
from app.core import gerar_token_recuperacao, gerar_hash_token, settings


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

def cpfSenha(
    cpf: str,
    db: Session
):
    mensagem = {
        "message": (
            "Caso exista uma conta vinculada ao CPF "
            "informado, um link para redefinição de senha "
            "será enviado ao e-mail cadastrado."
        )
    }

    user = user_repository.get_by_cpf(
        db,
        cpf
    )

    if user is None:
        return mensagem

    token = gerar_token_recuperacao()

    token_hash = gerar_hash_token(token)

    agora = datetime.now(timezone.utc).replace(
        tzinfo=None
    )

    expires_at = agora + timedelta(
        minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES
    )

    try:
        password_reset_repository.invalidate_user_tokens(
            db,
            user.id
        )
        password_reset = PasswordReset(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            created_at=agora,
            used=False
        )

        password_reset_repository.create(
            db,
            password_reset
        )

        db.commit()

    except Exception:

        db.rollback()

        raise


    link = (
        f"{settings.FRONTEND_URL.rstrip('/')}"
        f"/templates/redefinir_senha.html"
        f"#token={token}"
    )
        
    email = email_service.recuperar_senha(user, link)

    return mensagem



def redefinir_senha(
    db: Session,
    dados: RedefinirSenha
):

    if dados.nova_senha != dados.confirmar_senha:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="As senhas não coincidem."
        )

    token_hash = gerar_hash_token(
        dados.token
    )

    agora = datetime.now(timezone.utc).replace(
        tzinfo=None
    )

    password_reset = (
        password_reset_repository.get_by_token_hash(
            db,
            token_hash
        )
    )

    if (
        password_reset is None or password_reset.used or password_reset.expires_at <= agora
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido ou expirado."
        )

    user = user_repository.get_by_id(
        db,
        password_reset.user_id
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido ou expirado."
        )

    nova_senha_hash = hash_password(
        dados.nova_senha
    )

    try:

        agora = datetime.now(timezone.utc).replace(
            tzinfo=None
        )

        quantidade_atualizada = (
            password_reset_repository.consume_token(
                db,
                token_hash,
                agora
            )
        )

        if quantidade_atualizada != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido ou expirado."
            )

        user.password_hash = nova_senha_hash

        password_reset_repository.invalidate_user_tokens(
            db,
            user.id
        )

        db.commit()

    except Exception:

        db.rollback()

        raise

    return {
        "message": "Senha redefinida com sucesso!"
    }