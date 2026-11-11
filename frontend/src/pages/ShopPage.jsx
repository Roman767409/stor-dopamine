import { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

function ProductCard({ product }) {
  const { addToCart } = useCart()
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [isAdded, setIsAdded] = useState(false)

  // Через 1,5 с після натискання повертаємо текст кнопки назад
  useEffect(() => {
    if (!isAdded) return
    const timer = setTimeout(() => setIsAdded(false), 1500)
    return () => clearTimeout(timer)
  }, [isAdded])

  function handleAdd() {
    // Гість не має кошика — відправляємо його увійти
    if (!user) {
      navigate('/login')
      return
    }
    addToCart(product)
    setIsAdded(true)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-gray-200 rounded-xl aspect-square w-full" />
      <h2 className="font-semibold">{product.title}</h2>
      <p className="text-sm text-gray-600">{product.category}</p>
      <p className="font-bold">{product.price} DP</p>
      <button
        type="button"
        onClick={handleAdd}
        disabled={isLoading}
        className="mt-auto bg-gray-200 hover:bg-gray-300 rounded-full px-6 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200"
      >
        {isAdded ? 'Added ✓' : 'Add to cart'}
      </button>
    </div>
  )
}

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
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  )
}

export default ShopPage
