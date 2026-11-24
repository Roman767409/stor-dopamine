// Heart toggle for favorites: outlined when the product is not saved, filled when it is
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'
import { focusRing } from '../utils/styles'

function HeartIcon({ filled }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 20.5s-7.5-4.6-9.3-9.3C1.5 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.5 0 5.6 3.5 4.4 6.7-1.8 4.7-9.3 9.3-9.3 9.3z" />
    </svg>
  )
}

// "overlay" sits on top of an image placeholder; "plain" matches the light gray buttons
const VARIANTS = {
  overlay: 'bg-white/90 hover:bg-white shadow-sm',
  plain: 'bg-gray-200 hover:bg-gray-300',
}

function FavoriteButton({ productId, variant = 'overlay', className = '' }) {
  const { t } = useTranslation()
  const { user, isLoading } = useAuth()
  const { isFavorite, toggleFavorite } = useFavorites()
  const navigate = useNavigate()
  const active = isFavorite(productId)
  const label = active ? t('favorites.remove') : t('favorites.add')

  function handleClick() {
    // A guest has no favorites list: send them to log in, the same as "Add to cart"
    if (!user) {
      navigate('/login')
      return
    }
    toggleFavorite(productId)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-full disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${
        active ? 'text-red-500' : 'text-gray-900'
      } ${focusRing} ${className}`}
    >
      <HeartIcon filled={active} />
    </button>
  )
}

export default FavoriteButton
