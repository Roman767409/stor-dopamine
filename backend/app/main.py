from fastapi import Depends, FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.core.errors import register_error_handlers
from app.database import get_db
from app.models import User
from app.services import auth_service, product_service

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)


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


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/products")
def list_products(db: Session = Depends(get_db)):
    return product_service.list_catalog(db)


@app.post("/api/auth/register", status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    return auth_service.register_user(db, data.email, data.password)


@app.post("/api/auth/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login_user(db, data.email, data.password)


@app.post("/api/auth/refresh")
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    return auth_service.refresh_session(db, body.refresh_token)


@app.post("/api/auth/logout", status_code=204)
def logout(body: RefreshRequest, db: Session = Depends(get_db)):
    auth_service.logout_session(db, body.refresh_token)
    return Response(status_code=204)


@app.get("/api/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return auth_service.user_to_dict(current_user)
