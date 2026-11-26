from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import User, UserRole


def create_admin():
    db = SessionLocal()

    try:
        email = "admin@email.com"

        existing_user = db.scalar(
            select(User).where(User.email == email)
        )

        if existing_user:
            print("Já existe um usuário com esse email.")
            return

        admin = User(
            name="Administrador",
            email=email,
            password_hash=hash_password("senha_admin"),
            role=UserRole.ADMIN.value,
            is_active=True,
            cpf = "00000000000",
            matricula = "00000000" 
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print(f"Admin criado com sucesso: {admin.email}")

    except Exception as error:
        db.rollback()
        print(f"Erro ao criar admin: {error}")

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()