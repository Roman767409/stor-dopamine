import { useEffect, useState } from 'react'
import axios from 'axios'

function ShopPage() {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    axios
      .get('http://127.0.0.1:8000/api/products')
      .then((response) => {
        setProducts(response.data)
      })
      .catch(() => {
        setError(true)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  return (
    <main className="max-w-[1100px] mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-8">Shop</h1>

      {isLoading && <p>Loading...</p>}

      {error && <p className="text-red-600">Не вдалося завантажити товари</p>}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product.id} className="flex flex-col gap-2">
              <div className="bg-gray-200 rounded-xl aspect-square w-full" />
              <h2 className="font-semibold">{product.name}</h2>
              <p className="text-sm text-gray-600">{product.category}</p>
              <p className="font-bold">{product.price_dp} DP</p>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

export default ShopPage
