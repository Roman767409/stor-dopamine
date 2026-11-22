from pydantic import BaseModel


# Balances after POST /api/users/me/balance/reset
class BalanceResetResponse(BaseModel):
    virtual_balance: float
    total_saved_amount: float
