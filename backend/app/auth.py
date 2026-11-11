import hashlib
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RefreshToken, User

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "30"))
REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_DAYS", "7"))

bearer = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash_refresh_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


# Короткоживучий access-токен (JWT) з id і роллю користувача
def create_access_token(user: User) -> str:
    now = _now()
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


# Довгоживучий refresh-токен: клієнт отримує рядок, у базі лежить лише його хеш
def create_refresh_token(db: Session, user: User) -> str:
    raw_token = secrets.token_urlsafe(48)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=_hash_refresh_token(raw_token),
            expires_at=_now() + timedelta(days=REFRESH_TOKEN_DAYS),
        )
    )
    db.commit()
    return raw_token


# Перевіряє refresh-токен, відкликає його й повертає власника.
# Новий refresh-токен після цього видає create_refresh_token.
def rotate_refresh_token(db: Session, raw_token: str) -> User:
    record = db.scalar(
        select(RefreshToken)
        .where(RefreshToken.token_hash == _hash_refresh_token(raw_token))
        .with_for_update()
    )
    now = _now()
    if record is None or record.revoked_at is not None or record.expires_at <= now:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.get(User, record.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    record.revoked_at = now
    db.commit()
    return user


# Відкликає refresh-токен (вихід із системи); невідомий токен просто ігнорується
def revoke_refresh_token(db: Session, raw_token: str) -> None:
    record = db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == _hash_refresh_token(raw_token)
        )
    )
    if record is not None and record.revoked_at is None:
        record.revoked_at = _now()
        db.commit()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[ALGORITHM],
            options={"require": ["sub", "exp", "iat"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Access-токен обов'язково містить роль
    if "role" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        user_uuid = uuid.UUID(payload["sub"])
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.get(User, user_uuid)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# Залежність, яка пускає лише користувачів із зазначеними ролями
def require_role(*roles: str):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user

    return dependency
