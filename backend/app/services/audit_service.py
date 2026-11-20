from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog, User
from app.repositories import audit_repository


# Record an audit event inside the caller's transaction.
# No commit here: the entry is saved only if the business change is committed too.
# actor is None for events without a signed-in user.
def record(
    db: Session,
    *,
    actor: User | None,
    action: str,
    entity_type: str,
    entity_id: Any = None,
    details: dict | None = None,
    request_id: str | None = None,
) -> AuditLog:
    return audit_repository.create_entry(
        db,
        actor_user_id=actor.id if actor is not None else None,
        # Email snapshot: stays as it was even if the user changes it later
        actor_email=actor.email if actor is not None else None,
        action=action,
        entity_type=entity_type,
        # Ids may be UUIDs or ints; the column stores text
        entity_id=str(entity_id) if entity_id is not None else None,
        details=details,
        request_id=request_id,
    )
