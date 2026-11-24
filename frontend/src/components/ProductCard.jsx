// Catalog card: image placeholder, title, category, price, "Add to cart" and a favorites heart
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import FavoriteButton from './FavoriteButton'
import { formatDp } from '../utils/format'
import { focusRing } from '../utils/styles'

function ProductCard({ product }) {
  const { t } = useTranslation()
  const { addToCart } = useCart()
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [isAdded, setIsAdded] = useState(false)

  // Restore the button text 1.5 s after a click
  useEffect(() => {
    if (!isAdded) return
    const timer = setTimeout(() => setIsAdded(false), 1500)
    return () => clearTimeout(timer)
  }, [isAdded])

  function handleAdd() {
    // A guest has no cart: send them to log in
    if (!user) {
      navigate('/login')
      return
    }
    addToCart(product)
    setIsAdded(true)
  }

  return (
    <div className="relative flex flex-col gap-2">
      <Link
        to={`/product/${product.id}`}
        className={`group flex flex-col gap-2 rounded-xl ${focusRing}`}
      >
        <div className="bg-gray-200 rounded-xl aspect-square w-full" />
        <h2 className="font-semibold group-hover:underline">{product.title}</h2>
        <p className="text-sm text-gray-600">{product.category}</p>
        <p className="font-bold">{formatDp(product.price)}</p>
      </Link>
      {/* Sits over the top-right corner of the image; outside the Link so it is not nested in it */}
      <FavoriteButton productId={product.id} className="absolute top-2 right-2" />
      <button
        type="button"
        onClick={handleAdd}
        disabled={isLoading}
        className={`mt-auto bg-gray-200 hover:bg-gray-300 rounded-full px-6 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200 ${focusRing}`}
      >
        {isAdded ? t('common.added') : t('common.addToCart')}
      </button>
    </div>
  )
}

export default ProductCard
