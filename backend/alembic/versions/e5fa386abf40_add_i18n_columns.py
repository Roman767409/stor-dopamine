"""add i18n columns to products and categories

Revision ID: e5fa386abf40
Revises: 06b5be59d167
Create Date: 2026-11-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e5fa386abf40'
down_revision: Union[str, Sequence[str], None] = '06b5be59d167'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Translations of the seed data, frozen in the migration on purpose
# (a migration must not depend on seed.py, which may change later).

# slug -> name translations
CATEGORY_NAMES = {
    "electronics": {"en": "Electronics", "pl": "Elektronika", "uk": "Електроніка"},
    "clothing": {"en": "Clothing", "pl": "Odzież", "uk": "Одяг"},
    "home": {"en": "Home", "pl": "Dom", "uk": "Дім"},
    "accessories": {"en": "Accessories", "pl": "Akcesoria", "uk": "Аксесуари"},
}

# current (Ukrainian) title -> (title translations, description translations)
PRODUCT_TEXTS = {
    "Бездротові навушники": (
        {"en": "Wireless headphones", "pl": "Słuchawki bezprzewodowe", "uk": "Бездротові навушники"},
        {"en": "Noise cancelling, 30 hours of battery life", "pl": "Redukcja szumów, 30 godzin pracy", "uk": "Шумозаглушення, 30 годин роботи"},
    ),
    "Кросівки для бігу": (
        {"en": "Running shoes", "pl": "Buty do biegania", "uk": "Кросівки для бігу"},
        {"en": "Light cushioning", "pl": "Lekka amortyzacja", "uk": "Легка амортизація"},
    ),
    "Механічна клавіатура": (
        {"en": "Mechanical keyboard", "pl": "Klawiatura mechaniczna", "uk": "Механічна клавіатура"},
        {"en": "RGB backlight, red switches", "pl": "Podświetlenie RGB, czerwone przełączniki", "uk": "RGB-підсвітка, червоні перемикачі"},
    ),
    "Настільна лампа": (
        {"en": "Desk lamp", "pl": "Lampa biurkowa", "uk": "Настільна лампа"},
        {"en": "Adjustable brightness", "pl": "Regulowana jasność", "uk": "Регульована яскравість"},
    ),
    "Рюкзак для ноутбука": (
        {"en": "Laptop backpack", "pl": "Plecak na laptopa", "uk": "Рюкзак для ноутбука"},
        {"en": "Water-resistant, 25 litres", "pl": "Wodoodporny, 25 litrów", "uk": "Водостійкий, 25 літрів"},
    ),
    "Смарт-годинник": (
        {"en": "Smartwatch", "pl": "Smartwatch", "uk": "Смарт-годинник"},
        {"en": "Heart rate monitor and GPS", "pl": "Pulsometr i GPS", "uk": "Пульсометр і GPS"},
    ),
    "Термокружка": (
        {"en": "Thermal mug", "pl": "Kubek termiczny", "uk": "Термокружка"},
        {"en": "Keeps drinks hot for 8 hours", "pl": "Utrzymuje ciepło przez 8 godzin", "uk": "Тримає тепло 8 годин"},
    ),
    "Худі оверсайз": (
        {"en": "Oversized hoodie", "pl": "Bluza oversize", "uk": "Худі оверсайз"},
        {"en": "100% cotton", "pl": "100% bawełna", "uk": "100% бавовна"},
    ),
}

# Lightweight table definitions for the data update (independent of app.models)
categories = sa.table(
    "categories",
    sa.column("slug", sa.String),
    sa.column("name_i18n", postgresql.JSONB),
)
products = sa.table(
    "products",
    sa.column("title", sa.String),
    sa.column("title_i18n", postgresql.JSONB),
    sa.column("description_i18n", postgresql.JSONB),
)


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('categories', sa.Column('name_i18n', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('products', sa.Column('title_i18n', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('products', sa.Column('description_i18n', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    # Fill translations for the seed rows; rows not listed here stay NULL
    for slug, names in CATEGORY_NAMES.items():
        op.execute(
            categories.update()
            .where(categories.c.slug == slug)
            .values(name_i18n=names)
        )
    for title, (titles, descriptions) in PRODUCT_TEXTS.items():
        op.execute(
            products.update()
            .where(products.c.title == title)
            .values(title_i18n=titles, description_i18n=descriptions)
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('products', 'description_i18n')
    op.drop_column('products', 'title_i18n')
    op.drop_column('categories', 'name_i18n')
