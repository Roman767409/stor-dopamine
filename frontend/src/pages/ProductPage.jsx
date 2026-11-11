// Product screen: big image placeholder, details, quantity picker and "Add to cart"
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import EmptyState from '../components/EmptyState'
import PageContainer from '../components/PageContainer'
import { mockProducts } from '../mocks/mockData'
import { formatDp } from '../utils/format'
import { btnPrimary, focusRing } from '../utils/styles'

const MIN_QUANTITY = 1
const MAX_QUANTITY = 99

function clampQuantity(value) {
  const number = Math.round(Number(value))
  if (Number.isNaN(number)) return MIN_QUANTITY
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, number))
}

function ProductPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState('1')
  const [isAdded, setIsAdded] = useState(false)

  useEffect(() => {
    if (!isAdded) return
    const timer = setTimeout(() => setIsAdded(false), 1500)
    return () => clearTimeout(timer)
  }, [isAdded])

  // From the Shop card the product comes in navigation state; otherwise look it up in the mocks
  const stateProduct = location.state?.product
  const product =
    stateProduct?.id === id ? stateProduct : mockProducts.find((item) => item.id === id)

  if (!product) {
    return (
      <PageContainer>
        <EmptyState
          title="Product not found"
          text="It may have been removed or the link is wrong."
          actionLabel="Go to shop"
          onAction={() => navigate('/shop')}
        />
      </PageContainer>
    )
  }

  const count = clampQuantity(quantity)

  function handleQuantityChange(event) {
    setQuantity(event.target.value.replace(/\D/g, '').slice(0, 2))
  }

  function handleAdd() {
    if (!user) {
      navigate('/login')
      return
    }
    // addToCart adds one item per call, so we call it `count` times
    for (let i = 0; i < count; i += 1) {
      addToCart(product)
    }
    setIsAdded(true)
  }

  const stepButtonClass = `w-10 h-10 shrink-0 rounded-full bg-gray-200 hover:bg-gray-300 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200 ${focusRing}`

  return (
    <PageContainer>
      <Link to="/shop" className={`text-sm text-gray-600 hover:underline rounded ${focusRing}`}>
        ← Back to shop
      </Link>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        <div
          className="bg-gray-200 rounded-xl aspect-square w-full"
          role="img"
          aria-label={product.title}
        />

        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">{product.category}</p>
          <h1 className="text-3xl font-bold">{product.title}</h1>
          <p className="text-2xl font-bold">{formatDp(product.price)} DP</p>
          <p className="text-gray-600">{product.description}</p>

          <div className="flex flex-col gap-2 mt-2">
            <label htmlFor="product-quantity" className="text-xs text-gray-700">
              Quantity
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity(String(clampQuantity(count - 1)))}
                disabled={count <= MIN_QUANTITY}
                className={stepButtonClass}
              >
                −
              </button>
              <input
                id="product-quantity"
                type="text"
                inputMode="numeric"
                value={quantity}
                onChange={handleQuantityChange}
                onBlur={() => setQuantity(String(count))}
                className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-center outline-none focus:border-gray-900"
              />
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQuantity(String(clampQuantity(count + 1)))}
                disabled={count >= MAX_QUANTITY}
                className={stepButtonClass}
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={isLoading}
            className={`mt-2 w-full sm:w-auto sm:self-start ${btnPrimary}`}
          >
            Add to cart
          </button>
          <p role="status" className="text-sm font-medium text-green-700 min-h-5">
            {isAdded ? 'Added to cart ✓' : ''}
          </p>
        </div>
      </div>
    </PageContainer>
  )
}

export default ProductPage
