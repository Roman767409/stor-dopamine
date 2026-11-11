from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.auth import create_token, get_current_user, hash_password, verify_password
from app.database import get_db
from app.models import Product, User

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, value):
        if len(value.encode()) > 72:
            raise ValueError("Password is too long")
        return value


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
def register(data: Credentials, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    if db.scalar(select(User).where(func.lower(User.email) == email)):
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(email=email, password_hash=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": create_token(user.id), "user": user_to_dict(user)}


@app.post("/api/auth/login")
def login(data: Credentials, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.scalar(select(User).where(func.lower(User.email) == email))
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Wrong email or password")
    return {"token": create_token(user.id), "user": user_to_dict(user)}


@app.get("/api/auth/me")
def me(user: User = Depends(get_current_user)):
    return user_to_dict(user)