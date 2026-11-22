from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.constants import STARTING_BALANCE
from app.models import User
from app.repositories import user_repository
from app.services import audit_service


# Set the user's virtual balance back to the starting amount in one transaction.
# total_saved_amount is not touched: savings history stays as it is.
def reset_balance(db: Session, current_user: User, request_id: str | None = None) -> dict:
    try:
        # Row lock: a concurrent checkout or reset waits until this transaction ends
        user = user_repository.get_for_update(db, current_user.id)

        if user.virtual_balance >= STARTING_BALANCE:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "NOTHING_TO_RESET",
                    "message": "Balance is already at the starting amount",
                },
            )

        old_balance = user.virtual_balance
        user.virtual_balance = STARTING_BALANCE

        # Audit entry in the same transaction: saved only together with the reset
        audit_service.record(
            db,
            actor=user,
            action="BALANCE_RESET",
            entity_type="user",
            entity_id=user.id,
            details={
                "old_balance": float(old_balance),
                "new_balance": float(STARTING_BALANCE),
            },
            request_id=request_id,
        )

        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(user)
    return {
        "virtual_balance": float(user.virtual_balance),
        "total_saved_amount": float(user.total_saved_amount),
    }
