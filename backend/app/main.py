from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.auth import (
    ACCESS_TOKEN_MINUTES,
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    revoke_refresh_token,
    rotate_refresh_token,
    verify_password,
)
from app.database import get_db
from app.models import Product, User

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def password_is_valid(cls, value):
        if len(value.encode()) > 72:
            raise ValueError("Password is too long")
        has_letter = any(ch.isalpha() for ch in value)
        has_digit = any(ch.isdigit() for ch in value)
        if not (has_letter and has_digit):
            raise ValueError("Password must contain a letter and a digit")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RefreshRequest(BaseModel):
    refresh_token: str


# Однакова відповідь із парою токенів для login і refresh
def make_token_response(db: Session, user: User):
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(db, user)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_MINUTES * 60,
        "role": user.role,
    }


def user_to_dict(user: User):
    return {
        "id": str(user.id),
        "email": user.email,
        "role": user.role,
        "virtual_balance": float(user.virtual_balance),
        "total_saved_amount": float(user.total_saved_amount),
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/products")
def list_products(db: Session = Depends(get_db)):
    products = db.scalars(
        select(Product)
        .options(joinedload(Product.category))
        .where(Product.is_active.is_(True))
        .order_by(Product.title)
    ).all()
    return [
        {
            "id": str(p.id),
            "title": p.title,
            "description": p.description,
            "category": p.category.name,
            "category_slug": p.category.slug,
            "price": float(p.price),
            "image_url": p.image_url,
        }
        for p in products
    ]


@app.post("/api/auth/register", status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    if db.scalar(select(User).where(func.lower(User.email) == email)):
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(email=email, password_hash=hash_password(data.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Хтось зареєстрував цей email паралельно між перевіркою і збереженням
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already registered")
    db.refresh(user)
    return {"id": str(user.id), "email": user.email, "role": user.role}


@app.post("/api/auth/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    # bcrypt не приймає паролі довші за 72 байти — такий пароль точно неправильний
    if (
        user is None
        or len(data.password.encode()) > 72
        or not verify_password(data.password, user.password_hash)
    ):
        raise HTTPException(status_code=401, detail="Wrong email or password")
    return make_token_response(db, user)


@app.post("/api/auth/refresh")
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    user = rotate_refresh_token(db, body.refresh_token)
    return make_token_response(db, user)


@app.post("/api/auth/logout", status_code=204)
def logout(body: RefreshRequest, db: Session = Depends(get_db)):
    revoke_refresh_token(db, body.refresh_token)
    return Response(status_code=204)


@app.get("/api/auth/me")
def me(user: User = Depends(get_current_user)):
    return user_to_dict(user)