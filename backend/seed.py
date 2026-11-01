from app.database import SessionLocal
from app.models import Product

products = [
    Product(name="Бездротові навушники", description="Шумозаглушення, 30 годин роботи", category="Електроніка", price_dp=4500),
    Product(name="Механічна клавіатура", description="RGB-підсвітка, червоні перемикачі", category="Електроніка", price_dp=3200),
    Product(name="Рюкзак для ноутбука", description="Водостійкий, 25 літрів", category="Аксесуари", price_dp=1800),
    Product(name="Смарт-годинник", description="Пульсометр і GPS", category="Електроніка", price_dp=6900),
    Product(name="Кросівки для бігу", description="Легка амортизація", category="Одяг", price_dp=3900),
    Product(name="Настільна лампа", description="Регульована яскравість", category="Дім", price_dp=900),
    Product(name="Термокружка", description="Тримає тепло 8 годин", category="Дім", price_dp=450),
    Product(name="Худі оверсайз", description="100% бавовна", category="Одяг", price_dp=2100),
]

with SessionLocal() as session:
    session.add_all(products)
    session.commit()
    print(f"Added {len(products)} products")