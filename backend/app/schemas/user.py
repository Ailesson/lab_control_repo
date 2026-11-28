from datetime import datetime
from app.models import UserRole
from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    cpf: str
    matricula: str
    telefone: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    status: str | None = None
    is_active: bool
    created_at: datetime
    cpf: str | None = None
    matricula: str | None = None
    telefone: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UserRoleUpdate(BaseModel):
    role: UserRole

class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    is_active: bool | None = None
    telefone: str | None = None
    status: str | None = None

    