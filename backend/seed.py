from decimal import Decimal

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Category, Product

# (slug, name translations); the Ukrainian name is stored as the base name
CATEGORIES = [
    ("electronics", {"en": "Electronics", "pl": "Elektronika", "uk": "Електроніка"}),
    ("accessories", {"en": "Accessories", "pl": "Akcesoria", "uk": "Аксесуари"}),
    ("clothing", {"en": "Clothing", "pl": "Odzież", "uk": "Одяг"}),
    ("home", {"en": "Home", "pl": "Dom", "uk": "Дім"}),
]

# (category slug, title translations, description translations, price, image_url);
# the Ukrainian title and description are stored as the base texts
PRODUCTS = [
    (
        "electronics",
        {"en": "Wireless headphones", "pl": "Słuchawki bezprzewodowe", "uk": "Бездротові навушники"},
        {"en": "Noise cancelling, 30 hours of battery life", "pl": "Redukcja szumów, 30 godzin pracy", "uk": "Шумозаглушення, 30 годин роботи"},
        Decimal("4500.00"),
        None,
    ),
    (
        "electronics",
        {"en": "Mechanical keyboard", "pl": "Klawiatura mechaniczna", "uk": "Механічна клавіатура"},
        {"en": "RGB backlight, red switches", "pl": "Podświetlenie RGB, czerwone przełączniki", "uk": "RGB-підсвітка, червоні перемикачі"},
        Decimal("3200.00"),
        None,
    ),
    (
        "accessories",
        {"en": "Laptop backpack", "pl": "Plecak na laptopa", "uk": "Рюкзак для ноутбука"},
        {"en": "Water-resistant, 25 litres", "pl": "Wodoodporny, 25 litrów", "uk": "Водостійкий, 25 літрів"},
        Decimal("1800.00"),
        None,
    ),
    (
        "electronics",
        {"en": "Smartwatch", "pl": "Smartwatch", "uk": "Смарт-годинник"},
        {"en": "Heart rate monitor and GPS", "pl": "Pulsometr i GPS", "uk": "Пульсометр і GPS"},
        Decimal("6900.00"),
        None,
    ),
    (
        "clothing",
        {"en": "Running shoes", "pl": "Buty do biegania", "uk": "Кросівки для бігу"},
        {"en": "Light cushioning", "pl": "Lekka amortyzacja", "uk": "Легка амортизація"},
        Decimal("3900.00"),
        None,
    ),
    (
        "home",
        {"en": "Desk lamp", "pl": "Lampa biurkowa", "uk": "Настільна лампа"},
        {"en": "Adjustable brightness", "pl": "Regulowana jasność", "uk": "Регульована яскравість"},
        Decimal("900.00"),
        None,
    ),
    (
        "home",
        {"en": "Thermal mug", "pl": "Kubek termiczny", "uk": "Термокружка"},
        {"en": "Keeps drinks hot for 8 hours", "pl": "Utrzymuje ciepło przez 8 godzin", "uk": "Тримає тепло 8 годин"},
        Decimal("450.00"),
        None,
    ),
    (
        "clothing",
        {"en": "Oversized hoodie", "pl": "Bluza oversize", "uk": "Худі оверсайз"},
        {"en": "100% cotton", "pl": "100% bawełna", "uk": "100% бавовна"},
        Decimal("2100.00"),
        None,
    ),
]

BASE_LANG = "uk"


# Fills empty translation columns of already seeded rows (matched by slug / base title)
def _fill_missing_translations(session) -> int:
    updated = 0
    categories = {c.slug: c for c in session.scalars(select(Category))}
    for slug, names in CATEGORIES:
        category = categories.get(slug)
        if category is not None and not category.name_i18n:
            category.name_i18n = names
            updated += 1

    products = {
        p.title: p
        for p in session.scalars(
            select(Product).where(
                Product.title.in_([titles[BASE_LANG] for _, titles, *_ in PRODUCTS])
            )
        )
    }
    for _, titles, descriptions, _, _ in PRODUCTS:
        product = products.get(titles[BASE_LANG])
        if product is None:
            continue
        if not product.title_i18n:
            product.title_i18n = titles
            updated += 1
        if not product.description_i18n:
            product.description_i18n = descriptions
            updated += 1
    return updated


def main() -> None:
    session = SessionLocal()
    try:
        if session.scalar(select(Category.id).limit(1)) is not None:
            # Already seeded: only add translations that are still missing
            updated = _fill_missing_translations(session)
            session.commit()
            print(f"База вже наповнена; оновлено полів перекладу: {updated}")
            return

        categories = {
            slug: Category(name=names[BASE_LANG], slug=slug, name_i18n=names)
            for slug, names in CATEGORIES
        }
        session.add_all(categories.values())
        session.flush()  # отримуємо id категорій

        products = [
            Product(
                category_id=categories[category_slug].id,
                title=titles[BASE_LANG],
                description=descriptions[BASE_LANG],
                title_i18n=titles,
                description_i18n=descriptions,
                price=price,
                image_url=image_url,
            )
            for category_slug, titles, descriptions, price, image_url in PRODUCTS
        ]
        session.add_all(products)
        session.commit()
        print(f"Додано {len(categories)} категорій і {len(products)} товарів")
    finally:
        session.close()


if __name__ == "__main__":
    main()
