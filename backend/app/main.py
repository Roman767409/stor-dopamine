from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.errors import register_error_handlers
from app.routers import (
    admin_analytics,
    admin_logs,
    admin_products,
    analytics,
    auth,
    categories,
    health,
    orders,
    products,
    users,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)

app.include_router(health.router)
app.include_router(products.router)
app.include_router(categories.router)
app.include_router(auth.router)
app.include_router(orders.router)
app.include_router(analytics.router, prefix="/api/analytics")
app.include_router(admin_products.router)
app.include_router(admin_logs.router)
app.include_router(admin_analytics.router)
app.include_router(users.router)
