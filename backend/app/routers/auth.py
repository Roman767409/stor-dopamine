from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", status_code=201)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    return auth_service.register_user(db, data.email, data.password)


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login_user(db, data.email, data.password)


@router.post("/refresh")
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    return auth_service.refresh_session(db, body.refresh_token)


@router.post("/logout", status_code=204)
def logout(body: RefreshRequest, db: Session = Depends(get_db)):
    auth_service.logout_session(db, body.refresh_token)
    return Response(status_code=204)


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return auth_service.user_to_dict(current_user)
