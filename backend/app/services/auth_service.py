from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import (
    ACCESS_TOKEN_MINUTES,
    create_access_token,
    create_refresh_token,
    hash_password,
    revoke_refresh_token,
    rotate_refresh_token,
    verify_password,
)
from app.models import User
from app.repositories import user_repository


def _email_exists_error() -> HTTPException:
    return HTTPException(
        status_code=409,
        detail={
            "code": "EMAIL_ALREADY_EXISTS",
            "message": "Email already registered",
        },
    )


def user_to_dict(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "role": user.role,
        "virtual_balance": float(user.virtual_balance),
        "total_saved_amount": float(user.total_saved_amount),
    }


# Однакова відповідь із парою токенів для login і refresh
def issue_tokens(db: Session, user: User) -> dict:
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(db, user)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_MINUTES * 60,
        "role": user.role,
    }


def register_user(db: Session, email: str, password: str) -> dict:
    if user_repository.get_by_email(db, email) is not None:
        raise _email_exists_error()
    try:
        user = user_repository.create(db, email, hash_password(password))
    except IntegrityError:
        # Хтось зареєстрував цей email паралельно між перевіркою і збереженням
        db.rollback()
        raise _email_exists_error()
    return {"id": str(user.id), "email": user.email, "role": user.role}


def login_user(db: Session, email: str, password: str) -> dict:
    user = user_repository.get_by_email(db, email)
    # bcrypt не приймає паролі довші за 72 байти — такий пароль точно неправильний
    if (
        user is None
        or len(password.encode()) > 72
        or not verify_password(password, user.password_hash)
    ):
        raise HTTPException(
            status_code=401,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": "Wrong email or password",
            },
        )
    return issue_tokens(db, user)


def refresh_session(db: Session, raw_refresh_token: str) -> dict:
    user = rotate_refresh_token(db, raw_refresh_token)
    return issue_tokens(db, user)


def logout_session(db: Session, raw_refresh_token: str) -> None:
    revoke_refresh_token(db, raw_refresh_token)
