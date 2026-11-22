from decimal import Decimal

# Virtual balance every account starts with; must match the users.virtual_balance
# server default (app/models.py, migrations)
STARTING_BALANCE = Decimal("100000.00")
