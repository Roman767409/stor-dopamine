import uuid

from helpers import error_code


def test_list_returns_seeded_products(client):
    response = client.get("/api/products", params={"page_size": 50})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 8
    titles = {p["title"] for p in body["items"]}
    assert "Термокружка" in titles
    for product in body["items"]:
        assert {"id", "title", "price", "category", "category_slug"} <= product.keys()


def test_search_by_title_is_case_insensitive(client, make_product):
    token = uuid.uuid4().hex[:10]
    product = make_product(title=f"Searchable Gadget {token}")

    response = client.get("/api/products", params={"q": f"gadget {token.upper()}"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == str(product.id)


def test_search_seeded_product(client):
    response = client.get("/api/products", params={"q": "Термокружка"})
    assert response.status_code == 200
    items = response.json()["items"]
    assert items
    assert all("Термокружка" in p["title"] for p in items)


def test_filter_by_category(client):
    response = client.get(
        "/api/products", params={"category": "electronics", "page_size": 50}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 3
    assert all(p["category_slug"] == "electronics" for p in body["items"])


def test_filter_by_unknown_category_returns_empty(client):
    response = client.get("/api/products", params={"category": "no-such-category"})
    assert response.status_code == 200
    assert response.json()["total"] == 0


def test_get_product_by_id(client, make_product):
    product = make_product(price="321.00")
    response = client.get(f"/api/products/{product.id}")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(product.id)
    assert body["price"] == 321.0


def test_get_missing_product_returns_404(client):
    response = client.get(f"/api/products/{uuid.uuid4()}")
    assert response.status_code == 404
    assert error_code(response) == "PRODUCT_NOT_FOUND"
