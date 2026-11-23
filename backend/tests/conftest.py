"""Shared fixtures for the backend test suite.

The suite runs against a separate database (dopaminestore_test by default) that
is dropped and recreated once per session. The application never sees the dev
database: DATABASE_URL is replaced in the environment *before* any `app` module
is imported, and app/database.py builds its engine from that variable
(load_dotenv() does not override variables that are already set).

audit_logs is append-only, so tables are never cleaned between tests; every
test works with its own users (uuid-based emails) and its own products.
"""

import os
import re
import uuid
from decimal import Decimal
from pathlib import Path

import pytest
from dotenv import dotenv_values
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

BACKEND_DIR = Path(__file__).resolve().parent.parent
TEST_DB_DEFAULT_NAME = "dopaminestore_test"


def _resolve_test_database_url() -> str:
    explicit = os.environ.get("TEST_DATABASE_URL")
    if explicit:
        return explicit
    base = os.environ.get("DATABASE_URL") or dotenv_values(BACKEND_DIR / ".env").get(
        "DATABASE_URL"
    )
    if not base:
        raise RuntimeError("Set TEST_DATABASE_URL or DATABASE_URL to run the tests")
    return (
        make_url(base)
        .set(database=TEST_DB_DEFAULT_NAME)
        .render_as_string(hide_password=False)
    )


TEST_DATABASE_URL = _resolve_test_database_url()
TEST_DB_NAME = make_url(TEST_DATABASE_URL).database or ""

# Safety net: the session fixture drops this database, so it must be a test one
assert TEST_DB_NAME.endswith("_test"), f"Refusing to use non-test database {TEST_DB_NAME!r}"
assert re.fullmatch(r"[A-Za-z0-9_]+", TEST_DB_NAME), "Unexpected test database name"

# Point the application at the test database before it is imported
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

from fastapi.testclient import TestClient  # noqa: E402

import app.database as app_database  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Category, Product, User  # noqa: E402
from helpers import DEFAULT_PASSWORD, bearer, unique_email  # noqa: E402

# Double check that the app engine really points at the test database
assert app_database.engine.url.database == TEST_DB_NAME, "App is not using the test DB"

def _recreate_test_database() -> None:
    assert TEST_DB_NAME.endswith("_test")
    maintenance_url = make_url(TEST_DATABASE_URL).set(database="postgres")
    engine = create_engine(maintenance_url, isolation_level="AUTOCOMMIT")
    try:
        with engine.connect() as conn:
            # Kick out leftover sessions (e.g. from an aborted previous run)
            conn.execute(
                text(
                    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                    "WHERE datname = :name AND pid <> pg_backend_pid()"
                ),
                {"name": TEST_DB_NAME},
            )
            conn.execute(text(f'DROP DATABASE IF EXISTS "{TEST_DB_NAME}" WITH (FORCE)'))
            conn.execute(text(f'CREATE DATABASE "{TEST_DB_NAME}"'))
    finally:
        engine.dispose()


def _run_migrations() -> None:
    from alembic import command
    from alembic.config import Config

    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    # env.py also reads DATABASE_URL from app.database, which is the test URL now
    config.set_main_option("sqlalchemy.url", TEST_DATABASE_URL.replace("%", "%%"))
    command.upgrade(config, "head")


def _seed() -> None:
    import seed  # backend/seed.py; uses app.database.SessionLocal -> test DB

    seed.main()


@pytest.fixture(scope="session", autouse=True)
def test_database():
    # Release pooled connections so the database can be dropped
    app_database.engine.dispose()
    _recreate_test_database()
    _run_migrations()
    _seed()
    yield TEST_DATABASE_URL
    app_database.engine.dispose()


@pytest.fixture
def db_session():
    session = app_database.SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def _login(client: TestClient, email: str, password: str) -> dict:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    tokens = response.json()
    headers = bearer(tokens["access_token"])
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200, me.text
    return {
        "email": email,
        "password": password,
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "tokens": tokens,
        "headers": headers,
        "user": me.json(),
    }


@pytest.fixture
def register_and_login(client):
    """Factory: registers a fresh user and logs in; returns tokens, headers and user."""

    def factory(email: str | None = None, password: str = DEFAULT_PASSWORD) -> dict:
        email = email or unique_email()
        response = client.post(
            "/api/auth/register", json={"email": email, "password": password}
        )
        assert response.status_code == 201, response.text
        return _login(client, email, password)

    return factory


@pytest.fixture
def auth_headers(register_and_login) -> dict[str, str]:
    return register_and_login()["headers"]


@pytest.fixture
def admin_user(client, register_and_login, db_session) -> dict:
    """A user promoted to admin directly in the DB, then logged in again."""
    account = register_and_login(email=unique_email("admin"))
    user = db_session.get(User, uuid.UUID(account["user"]["id"]))
    user.role = "admin"
    db_session.commit()
    return _login(client, account["email"], account["password"])


@pytest.fixture
def make_product(db_session):
    """Factory: inserts a product straight into the DB (isolated from seeded data)."""

    def factory(
        price: str | Decimal = "100.00",
        *,
        title: str | None = None,
        is_active: bool = True,
        category_slug: str = "home",
    ) -> Product:
        category = db_session.query(Category).filter_by(slug=category_slug).one()
        product = Product(
            category_id=category.id,
            title=title or f"Test product {uuid.uuid4().hex[:12]}",
            description="Created by tests",
            price=Decimal(str(price)),
            is_active=is_active,
        )
        db_session.add(product)
        db_session.commit()
        db_session.refresh(product)
        return product

    return factory

