"""Localized product titles, descriptions and category names (Accept-Language)."""

import uuid

import pytest
from sqlalchemy import select

from app.core.lang import localized, parse_accept_language
from app.models import AuditLog, Category, Product
from helpers import error_code, item, place_order

# Seed products: base (Ukrainian) title -> expected title per language
SEED_TITLES = {
    "Бездротові навушники": {"en": "Wireless headphones", "pl": "Słuchawki bezprzewodowe", "uk": "Бездротові навушники"},
    "Кросівки для бігу": {"en": "Running shoes", "pl": "Buty do biegania", "uk": "Кросівки для бігу"},
    "Механічна клавіатура": {"en": "Mechanical keyboard", "pl": "Klawiatura mechaniczna", "uk": "Механічна клавіатура"},
    "Настільна лампа": {"en": "Desk lamp", "pl": "Lampa biurkowa", "uk": "Настільна лампа"},
    "Рюкзак для ноутбука": {"en": "Laptop backpack", "pl": "Plecak na laptopa", "uk": "Рюкзак для ноутбука"},
    "Смарт-годинник": {"en": "Smartwatch", "pl": "Smartwatch", "uk": "Смарт-годинник"},
    "Термокружка": {"en": "Thermal mug", "pl": "Kubek termiczny", "uk": "Термокружка"},
    "Худі оверсайз": {"en": "Oversized hoodie", "pl": "Bluza oversize", "uk": "Худі оверсайз"},
}

# Category slug -> expected name per language
CATEGORY_NAMES = {
    "electronics": {"en": "Electronics", "pl": "Elektronika", "uk": "Електроніка"},
    "clothing": {"en": "Clothing", "pl": "Odzież", "uk": "Одяг"},
    "home": {"en": "Home", "pl": "Dom", "uk": "Дім"},
    "accessories": {"en": "Accessories", "pl": "Akcesoria", "uk": "Аксесуари"},
}

HEADPHONES = "Бездротові навушники"
MUG = "Термокружка"
LANGS = ["en", "pl", "uk"]


def lang_header(lang: str) -> dict[str, str]:
    return {"Accept-Language": lang}


def seed_product(db_session, base_title: str) -> Product:
    return db_session.scalars(select(Product).where(Product.title == base_title)).one()


def catalog(client, headers=None, **params) -> list[dict]:
    response = client.get(
        "/api/products", params={"page_size": 50, **params}, headers=headers or {}
    )
    assert response.status_code == 200, response.text
    return response.json()["items"]


# --- Language selection ---


@pytest.mark.parametrize(
    ("header", "expected"),
    [
        (None, "en"),
        ("", "en"),
        ("en", "en"),
        ("pl", "pl"),
        ("uk", "uk"),
        ("ua", "uk"),
        ("uk-UA,uk;q=0.9,en;q=0.8", "uk"),
        ("pl_PL", "pl"),
        ("PL-pl", "pl"),
        ("de", "en"),
        ("de-DE,pl;q=0.9", "en"),  # only the first language counts
        ("*", "en"),
    ],
)
def test_parse_accept_language(header, expected):
    assert parse_accept_language(header) == expected


def test_localized_falls_back_to_english_then_base():
    i18n = {"en": "Lamp", "pl": "Lampa"}
    assert localized(i18n, "Лампа", "pl") == "Lampa"
    assert localized(i18n, "Лампа", "uk") == "Lamp"
    assert localized({"pl": "Lampa"}, "Лампа", "uk") == "Лампа"
    assert localized({"uk": ""}, "Лампа", "uk") == "Лампа"
    assert localized(None, "Лампа", "pl") == "Лампа"


# --- Public catalog, product and categories ---


@pytest.mark.parametrize("lang", LANGS)
def test_catalog_titles_and_categories_follow_accept_language(client, lang):
    items = catalog(client, lang_header(lang))
    titles = {p["title"] for p in items}
    assert {names[lang] for names in SEED_TITLES.values()} <= titles

    by_title = {p["title"]: p for p in items}
    headphones = by_title[SEED_TITLES[HEADPHONES][lang]]
    assert headphones["category"] == CATEGORY_NAMES["electronics"][lang]
    assert headphones["category_slug"] == "electronics"


def test_catalog_sends_vary_header(client):
    response = client.get("/api/products", headers=lang_header("pl"))
    assert "accept-language" in response.headers.get("vary", "").lower()


@pytest.mark.parametrize(
    ("lang", "title", "description", "category"),
    [
        ("en", "Wireless headphones", "Noise cancelling, 30 hours of battery life", "Electronics"),
        ("pl", "Słuchawki bezprzewodowe", "Redukcja szumów, 30 godzin pracy", "Elektronika"),
        ("uk", "Бездротові навушники", "Шумозаглушення, 30 годин роботи", "Електроніка"),
    ],
)
def test_product_details_are_localized(client, db_session, lang, title, description, category):
    product = seed_product(db_session, HEADPHONES)
    response = client.get(f"/api/products/{product.id}", headers=lang_header(lang))
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == title
    assert body["description"] == description
    assert body["category"] == category
    # Same response shape as before
    assert set(body) == {
        "id", "title", "description", "category", "category_slug", "price", "image_url"
    }


@pytest.mark.parametrize("lang", LANGS)
def test_categories_are_localized(client, lang):
    response = client.get("/api/categories", headers=lang_header(lang))
    assert response.status_code == 200
    names = {c["slug"]: c["name"] for c in response.json()}
    for slug, expected in CATEGORY_NAMES.items():
        assert names[slug] == expected[lang]


@pytest.mark.parametrize("headers", [{}, {"Accept-Language": "de"}, {"Accept-Language": "fr-FR"}])
def test_missing_or_unknown_language_falls_back_to_english(client, db_session, headers):
    product = seed_product(db_session, MUG)
    body = client.get(f"/api/products/{product.id}", headers=headers).json()
    assert body["title"] == "Thermal mug"
    assert body["description"] == "Keeps drinks hot for 8 hours"
    assert body["category"] == "Home"

    categories = {c["slug"]: c["name"] for c in client.get("/api/categories", headers=headers).json()}
    assert categories["clothing"] == "Clothing"


def test_product_without_translations_uses_base_title(client, make_product):
    product = make_product(title=f"Plain lamp {uuid.uuid4().hex[:8]}")
    for lang in LANGS:
        body = client.get(f"/api/products/{product.id}", headers=lang_header(lang)).json()
        assert body["title"] == product.title
        assert body["description"] == "Created by tests"
        # The seeded category still has translations
        assert body["category"] == CATEGORY_NAMES["home"][lang]


# --- Search and sorting ---


@pytest.mark.parametrize("query", ["headphones", "WIRELESS", "słuchawki", "SŁUCHAWKI", "навушники", "Бездротові"])
@pytest.mark.parametrize("lang", LANGS)
def test_search_matches_title_in_any_language(client, db_session, query, lang):
    product = seed_product(db_session, HEADPHONES)
    items = catalog(client, lang_header(lang), q=query)
    found = {p["id"]: p["title"] for p in items}
    assert found.get(str(product.id)) == SEED_TITLES[HEADPHONES][lang]


def test_search_does_not_match_other_products(client):
    titles = {p["title"] for p in catalog(client, lang_header("en"), q="klawiatura")}
    assert titles == {"Mechanical keyboard"}


@pytest.mark.parametrize(
    ("lang", "expected"),
    [
        ("en", ["Mechanical keyboard", "Smartwatch", "Wireless headphones"]),
        ("uk", ["Бездротові навушники", "Механічна клавіатура", "Смарт-годинник"]),
    ],
)
def test_title_sort_uses_localized_title(client, lang, expected):
    items = catalog(client, lang_header(lang), category="electronics", sort="title_asc")
    seeded = [p["title"] for p in items if p["title"] in expected]
    assert seeded == expected


# --- Orders and analytics ---


@pytest.fixture
def seeded_order(client, register_and_login, db_session):
    account = register_and_login()
    headphones = seed_product(db_session, HEADPHONES)
    mug = seed_product(db_session, MUG)
    response = place_order(client, account["headers"], [item(headphones), item(mug, 20)])
    assert response.status_code == 201, response.text
    return {"headers": account["headers"], "order_id": response.json()["order_id"], "mug": mug}


@pytest.mark.parametrize("lang", LANGS)
def test_order_details_titles_are_localized(client, seeded_order, lang):
    response = client.get(
        f"/api/orders/{seeded_order['order_id']}",
        headers={**seeded_order["headers"], **lang_header(lang)},
    )
    assert response.status_code == 200
    titles = sorted(line["title"] for line in response.json()["items"])
    assert titles == sorted([SEED_TITLES[HEADPHONES][lang], SEED_TITLES[MUG][lang]])


@pytest.mark.parametrize("lang", LANGS)
def test_savings_categories_are_localized(client, seeded_order, lang):
    response = client.get(
        "/api/analytics/savings", headers={**seeded_order["headers"], **lang_header(lang)}
    )
    assert response.status_code == 200
    by_slug = {row["slug"]: row["category"] for row in response.json()["by_category"]}
    assert by_slug == {
        "electronics": CATEGORY_NAMES["electronics"][lang],
        "home": CATEGORY_NAMES["home"][lang],
    }


@pytest.mark.parametrize("lang", LANGS)
def test_admin_analytics_names_are_localized(client, seeded_order, admin_user, lang):
    response = client.get(
        "/api/admin/analytics", headers={**admin_user["headers"], **lang_header(lang)}
    )
    assert response.status_code == 200
    body = response.json()
    top_products = {row["product_id"]: row["title"] for row in body["top_products"]}
    assert top_products[str(seeded_order["mug"].id)] == SEED_TITLES[MUG][lang]
    top_categories = {row["slug"]: row["category"] for row in body["top_categories"]}
    assert top_categories["home"] == CATEGORY_NAMES["home"][lang]
    assert top_categories["electronics"] == CATEGORY_NAMES["electronics"][lang]


# --- Admin products ---


def _home_category_id(db_session) -> int:
    return db_session.scalars(select(Category.id).where(Category.slug == "home")).one()


def _audit_entries(db_session, product_id: str) -> list[AuditLog]:
    db_session.expire_all()
    return list(
        db_session.scalars(
            select(AuditLog)
            .where(AuditLog.entity_type == "product", AuditLog.entity_id == product_id)
            .order_by(AuditLog.id)
        )
    )


def test_admin_list_returns_base_texts_and_translations(client, admin_user):
    response = client.get(
        "/api/admin/products",
        params={"q": "słuchawki", "page_size": 100},
        headers={**admin_user["headers"], **lang_header("pl")},
    )
    assert response.status_code == 200
    items = [p for p in response.json()["items"] if p["title"] == HEADPHONES]
    assert len(items) == 1
    product = items[0]
    assert product["description"] == "Шумозаглушення, 30 годин роботи"
    assert product["title_i18n"] == SEED_TITLES[HEADPHONES]
    assert product["description_i18n"]["en"] == "Noise cancelling, 30 hours of battery life"
    assert product["category"]["name"] == "Elektronika"


def test_admin_creates_and_updates_product_translations(client, admin_user, db_session):
    headers = admin_user["headers"]
    base_title = f"Нічник {uuid.uuid4().hex[:8]}"

    created = client.post(
        "/api/admin/products",
        json={
            "title": base_title,
            "description": "Тепле світло",
            "title_i18n": {"en": "  Night light  ", "pl": "Lampka nocna", "uk": "   "},
            "description_i18n": {"en": "Warm light"},
            "price": "350.00",
            "category_id": _home_category_id(db_session),
        },
        headers=headers,
    )
    assert created.status_code == 201, created.text
    body = created.json()
    product_id = body["id"]
    # Admin responses keep the base texts in title/description
    assert body["title"] == base_title
    assert body["description"] == "Тепле світло"
    # Values are trimmed and empty ones are dropped
    assert body["title_i18n"] == {"en": "Night light", "pl": "Lampka nocna", "uk": None}
    assert body["description_i18n"] == {"en": "Warm light", "pl": None, "uk": None}

    public_pl = client.get(f"/api/products/{product_id}", headers=lang_header("pl")).json()
    assert public_pl["title"] == "Lampka nocna"
    assert public_pl["description"] == "Warm light"  # no pl description -> en
    public_uk = client.get(f"/api/products/{product_id}", headers=lang_header("uk")).json()
    assert public_uk["title"] == "Night light"  # no uk title -> en

    # PATCH replaces the whole translations object
    updated = client.patch(
        f"/api/admin/products/{product_id}",
        json={"title_i18n": {"uk": "Нічна лампа"}},
        headers=headers,
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["title_i18n"] == {"en": None, "pl": None, "uk": "Нічна лампа"}
    assert updated.json()["title"] == base_title

    public_en = client.get(f"/api/products/{product_id}", headers=lang_header("en")).json()
    assert public_en["title"] == base_title  # no en/... -> base
    public_uk = client.get(f"/api/products/{product_id}", headers=lang_header("uk")).json()
    assert public_uk["title"] == "Нічна лампа"

    entries = _audit_entries(db_session, product_id)
    assert [e.action for e in entries] == ["PRODUCT_CREATED", "PRODUCT_UPDATED"]
    assert entries[0].details["title_i18n"] == {"en": "Night light", "pl": "Lampka nocna"}
    assert entries[1].details["changes"] == {
        "title_i18n": {
            "old": {"en": "Night light", "pl": "Lampka nocna"},
            "new": {"uk": "Нічна лампа"},
        }
    }

    # Sending the same translations again changes nothing and is not audited
    same = client.patch(
        f"/api/admin/products/{product_id}",
        json={"title_i18n": {"uk": "Нічна лампа"}},
        headers=headers,
    )
    assert same.status_code == 200
    assert len(_audit_entries(db_session, product_id)) == 2

    # null clears the translations
    cleared = client.patch(
        f"/api/admin/products/{product_id}",
        json={"description_i18n": None},
        headers=headers,
    )
    assert cleared.status_code == 200
    assert cleared.json()["description_i18n"] is None


@pytest.mark.parametrize(
    "payload",
    [
        {"title_i18n": {"de": "Nachtlicht"}},
        {"title_i18n": {"en": "Night light", "ua": "Нічник"}},
        {"title_i18n": {"en": 5}},
        {"title_i18n": {"en": None}},
        {"title_i18n": {"en": "x" * 121}},
        {"title_i18n": ["en", "Night light"]},
        {"description_i18n": {"fr": "Lumière"}},
    ],
)
def test_admin_rejects_invalid_translations(client, admin_user, db_session, payload):
    headers = admin_user["headers"]
    created = client.post(
        "/api/admin/products",
        json={
            "title": "Invalid i18n probe",
            "price": "10.00",
            "category_id": _home_category_id(db_session),
            **payload,
        },
        headers=headers,
    )
    assert created.status_code == 422, created.text
    assert error_code(created) == "VALIDATION_ERROR"

    product_id = client.post(
        "/api/admin/products",
        json={"title": "Valid i18n probe", "price": "10.00", "category_id": _home_category_id(db_session)},
        headers=headers,
    ).json()["id"]
    patched = client.patch(f"/api/admin/products/{product_id}", json=payload, headers=headers)
    assert patched.status_code == 422, patched.text


def test_admin_title_translation_max_length_is_allowed(client, admin_user, db_session):
    response = client.post(
        "/api/admin/products",
        json={
            "title": "Long i18n probe",
            "title_i18n": {"en": "x" * 120},
            "price": "10.00",
            "category_id": _home_category_id(db_session),
        },
        headers=admin_user["headers"],
    )
    assert response.status_code == 201, response.text
    assert response.json()["title_i18n"]["en"] == "x" * 120
