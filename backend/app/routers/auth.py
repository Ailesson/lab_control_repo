from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.auth import Token, LoginRequest
from app.services import auth_service


router = APIRouter(
    prefix="/auth",
    tags=["Autenticação"]
)


@router.post(
    "/login",
    response_model=Token, status_code=status.HTTP_202_ACCEPTED
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    return auth_service.login(
        db,
        email=form_data.username,
        password=form_data.password
    )


@router.post(
    "/login/json",
    response_model=Token,
    status_code=status.HTTP_202_ACCEPTED,
)
def login_json(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    return auth_service.login(
        db,
        email=credentials.email,
        password=credentials.password
    )