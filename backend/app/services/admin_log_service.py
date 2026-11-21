from datetime import date, datetime, time, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import AuditLog
from app.repositories import audit_repository


def log_to_dict(entry: AuditLog) -> dict:
    return {
        "id": entry.id,
        "created_at": entry.created_at,
        "actor_user_id": entry.actor_user_id,
        "actor_email": entry.actor_email,
        "action": entry.action,
        "entity_type": entry.entity_type,
        "entity_id": entry.entity_id,
        "details": entry.details,
        "request_id": entry.request_id,
    }


# Start of the given UTC day
def _day_start(day: date) -> datetime:
    return datetime.combine(day, time.min, tzinfo=timezone.utc)


# Audit log page for admins; date_to includes the whole day (UTC)
def list_logs(
    db: Session,
    *,
    page: int,
    page_size: int,
    action: str | None,
    entity_type: str | None,
    actor: str | None,
    date_from: date | None,
    date_to: date | None,
) -> dict:
    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_DATE_RANGE",
                "message": "date_from must not be later than date_to",
            },
        )

    actor = actor.strip() if actor else None
    entries, total = audit_repository.search_entries(
        db,
        page=page,
        page_size=page_size,
        action=action,
        entity_type=entity_type,
        actor=actor or None,
        created_from=_day_start(date_from) if date_from is not None else None,
        # Exclusive upper bound: start of the day after date_to
        created_to=(
            _day_start(date_to + timedelta(days=1)) if date_to is not None else None
        ),
    )
    return {
        "items": [log_to_dict(entry) for entry in entries],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def list_actions(db: Session) -> dict:
    return {"actions": audit_repository.list_distinct_actions(db)}
