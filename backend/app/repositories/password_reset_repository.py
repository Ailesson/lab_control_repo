from sqlalchemy.orm import Session

from app.models import PasswordReset


def create(
    db: Session,
    password_reset: PasswordReset
):

    db.add(password_reset)
    db.flush()

    return password_reset


def get_by_token_hash(
    db: Session,
    token_hash: str
):

    return db.query(PasswordReset).filter(
        PasswordReset.token_hash == token_hash).first()


def invalidate_user_tokens(
    db: Session,
    user_id: int
):

    return db.query(PasswordReset).filter(
        PasswordReset.user_id == user_id,
        PasswordReset.used.is_(False)).update(
        {
            PasswordReset.used: True
        },
        synchronize_session=False
    )


def consume_token(
    db: Session,
    token_hash: str,
    agora
):

    return db.query(PasswordReset).filter(
        PasswordReset.token_hash == token_hash,
        PasswordReset.used.is_(False),
        PasswordReset.expires_at > agora).update(
        {
            PasswordReset.used: True
        },
        synchronize_session=False
    )