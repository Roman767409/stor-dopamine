from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.lang import get_lang
from app.database import get_db
from app.schemas.categories import CategoryOut
from app.services import category_service

router = APIRouter(prefix="/api/categories", tags=["categories"])


# Public list of categories sorted by name, with active product counts
@router.get("", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db), lang: str = Depends(get_lang)):
    return category_service.list_categories(db, lang)
