from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import require_role
from app.core.lang import get_lang
from app.database import get_db
from app.models import User
from app.schemas.admin_analytics import AdminAnalyticsResponse
from app.services import admin_analytics_service

router = APIRouter(prefix="/api/admin", tags=["admin"])

require_admin = require_role("admin")


# Store-wide statistics; `days` sets the period for *_in_period, new_users and by_day
@router.get("/analytics", response_model=AdminAnalyticsResponse)
def get_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
    lang: str = Depends(get_lang),
):
    return admin_analytics_service.get_analytics(db, days, lang)
