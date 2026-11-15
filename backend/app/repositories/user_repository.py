import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import User


# Пошук користувача за email без урахування регістру
def get_by_email(db: Session, email: str) -> User | None:
    return db.scalar(
        select(User).where(func.lower(User.email) == email.strip().lower())
    )


def get_by_id(db: Session, user_id: uuid.UUID) -> User | None:
    return db.get(User, user_id)


# Створює користувача; роль і баланс беруться зі значень за замовчуванням у базі
def create(db: Session, email: str, password_hash: str) -> User:
    user = User(email=email.strip().lower(), password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
