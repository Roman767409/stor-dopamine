from pydantic import BaseModel


# Category with the number of active products in it
class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    products_count: int
