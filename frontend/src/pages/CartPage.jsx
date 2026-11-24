import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { formatDp, formatNumber } from '../utils/format'

function CartItem({ item }) {
  const { t } = useTranslation()
  const { removeFromCart, setQuantity } = useCart()
  // Text in the field while the user types (may be empty for a moment)
  const [draft, setDraft] = useState(String(item.quantity))

  function handleChange(event) {
    const value = event.target.value
    setDraft(value)
    const number = Number(value)
    if (value !== '' && number >= 1 && number <= 99) {
      setQuantity(item.id, number)
    }
  }

  // When the field loses focus, show the real quantity from the cart
  function handleBlur() {
    const number = Number(draft)
    if (draft !== '' && !Number.isNaN(number)) {
      setQuantity(item.id, number)
      setDraft(String(Math.min(99, Math.max(1, Math.round(number)))))
    } else {
      setDraft(String(item.quantity))
    }
  }

  return (
    <li className="flex items-center gap-4 py-4 border-b border-gray-200">
      <div className="bg-gray-200 rounded-xl w-20 h-20 shrink-0" />

      <div className="flex-1 min-w-0">
        <h2 className="font-semibold truncate">{item.title}</h2>
        <p className="text-sm text-gray-600">{formatDp(item.price)}</p>
      </div>

      <input
        type="number"
        min="1"
        max="99"
        value={draft}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-label={t('cart.quantityOf', { title: item.title })}
        className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center"
      />

      <button
        type="button"
        onClick={() => removeFromCart(item.id)}
        className="bg-gray-200 hover:bg-gray-300 rounded-full px-4 py-2 text-sm font-medium"
      >
        {t('cart.remove')}
      </button>
    </li>
  )
}

function CartPage() {
  const { t } = useTranslation()
  const { items, totalItems, totalPrice } = useCart()
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()

  // While the session is checked it is not known yet whether this is a guest or a user
  if (isLoading) {
    return (
      <main className="max-w-[1100px] mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8">{t('cart.title')}</h1>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="max-w-[1100px] mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8">{t('cart.title')}</h1>
        <p className="mb-4">{t('cart.loginPrompt')}</p>
        <Link
          to="/login"
          className="inline-block bg-gray-200 hover:bg-gray-300 rounded-full px-6 py-2 font-medium"
        >
          {t('common.logIn')}
        </Link>
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="max-w-[1100px] mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8">{t('cart.title')}</h1>
        <p className="mb-4">{t('cart.empty')}</p>
        <Link
          to="/shop"
          className="inline-block bg-gray-200 hover:bg-gray-300 rounded-full px-6 py-2 font-medium"
        >
          {t('common.goToShop')}
        </Link>
      </main>
    )
  }

  const notEnoughDp = user !== null && totalPrice > user.virtual_balance
  const checkoutDisabled = isLoading || !user || items.length === 0 || notEnoughDp

  return (
    <main className="max-w-[1100px] mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-8">{t('cart.title')}</h1>

      <ul>
        {items.map((item) => (
          <CartItem key={item.id} item={item} />
        ))}
      </ul>

      <div className="mt-8 ml-auto max-w-sm flex flex-col gap-3">
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">{t('cart.items')}</span>
          <span className="font-medium">{formatNumber(totalItems)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">{t('common.total')}</span>
          <span className="font-bold whitespace-nowrap">{formatDp(totalPrice)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">{t('common.yourBalance')}</span>
          {isLoading ? (
            <span className="text-gray-400">…</span>
          ) : user ? (
            <span className="font-medium whitespace-nowrap">{formatDp(user.virtual_balance)}</span>
          ) : (
            <Link to="/login" className="font-medium underline">
              {t('cart.loginToSeeBalance')}
            </Link>
          )}
        </div>

        {notEnoughDp && <p className="text-red-600 font-medium">{t('common.notEnoughDp')}</p>}

        <button
          type="button"
          disabled={checkoutDisabled}
          onClick={() => navigate('/checkout')}
          className="bg-gray-200 hover:bg-gray-300 rounded-full px-6 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200"
        >
          {t('cart.checkout')}
        </button>
      </div>
    </main>
  )
}

export default CartPage
