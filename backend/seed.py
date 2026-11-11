from decimal import Decimal

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Category, Product

# (назва, slug)
CATEGORIES = [
    ("Електроніка", "electronics"),
    ("Аксесуари", "accessories"),
    ("Одяг", "clothing"),
    ("Дім", "home"),
]

# (назва категорії, title, description, price, image_url)
PRODUCTS = [
    ("Електроніка", "Бездротові навушники", "Шумозаглушення, 30 годин роботи", Decimal("4500.00"), None),
    ("Електроніка", "Механічна клавіатура", "RGB-підсвітка, червоні перемикачі", Decimal("3200.00"), None),
    ("Аксесуари", "Рюкзак для ноутбука", "Водостійкий, 25 літрів", Decimal("1800.00"), None),
    ("Електроніка", "Смарт-годинник", "Пульсометр і GPS", Decimal("6900.00"), None),
    ("Одяг", "Кросівки для бігу", "Легка амортизація", Decimal("3900.00"), None),
    ("Дім", "Настільна лампа", "Регульована яскравість", Decimal("900.00"), None),
    ("Дім", "Термокружка", "Тримає тепло 8 годин", Decimal("450.00"), None),
    ("Одяг", "Худі оверсайз", "100% бавовна", Decimal("2100.00"), None),
]


def main() -> None:
    session = SessionLocal()
    try:
        if session.scalar(select(Category.id).limit(1)) is not None:
            print("База вже наповнена, нічого не робимо")
            return

        categories = {name: Category(name=name, slug=slug) for name, slug in CATEGORIES}
        session.add_all(categories.values())
        session.flush()  # отримуємо id категорій

        products = [
            Product(
                category_id=categories[category_name].id,
                title=title,
                description=description,
                price=price,
                image_url=image_url,
            )
            for category_name, title, description, price, image_url in PRODUCTS
        ]
        session.add_all(products)
        session.commit()
        print(f"Додано {len(categories)} категорій і {len(products)} товарів")
    finally:
        session.close()


if __name__ == "__main__":
    main()
