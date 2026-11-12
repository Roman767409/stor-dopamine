import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

// 95500 -> "95 500"
function formatDp(amount) {
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function CartItem({ item }) {
  const { removeFromCart, setQuantity } = useCart()
  // Текст у полі, поки користувач друкує (може бути тимчасово порожнім)
  const [draft, setDraft] = useState(String(item.quantity))

  function handleChange(event) {
    const value = event.target.value
    setDraft(value)
    const number = Number(value)
    if (value !== '' && number >= 1 && number <= 99) {
      setQuantity(item.id, number)
    }
  }

  // Коли поле втрачає фокус, показуємо справжню кількість із кошика
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
        <p className="text-sm text-gray-600">{item.price} DP</p>
      </div>

      <input
        type="number"
        min="1"
        max="99"
        value={draft}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-label={`Quantity of ${item.title}`}
        className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center"
      />

      <button
        type="button"
        onClick={() => removeFromCart(item.id)}
        className="bg-gray-200 hover:bg-gray-300 rounded-full px-4 py-2 text-sm font-medium"
      >
        Remove
      </button>
    </li>
  )
}

function CartPage() {
  const { items, totalItems, totalPrice } = useCart()
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()

  // Поки перевіряється сесія, ще невідомо, гість це чи користувач
  if (isLoading) {
    return (
      <main className="max-w-[1100px] mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8">Cart</h1>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="max-w-[1100px] mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8">Cart</h1>
        <p className="mb-4">Log in to use your cart</p>
        <Link
          to="/login"
          className="inline-block bg-gray-200 hover:bg-gray-300 rounded-full px-6 py-2 font-medium"
        >
          Log in
        </Link>
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="max-w-[1100px] mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8">Cart</h1>
        <p className="mb-4">Your cart is empty</p>
        <Link
          to="/shop"
          className="inline-block bg-gray-200 hover:bg-gray-300 rounded-full px-6 py-2 font-medium"
        >
          Go to shop
        </Link>
      </main>
    )
  }

  const notEnoughDp = user !== null && totalPrice > user.virtual_balance
  const checkoutDisabled = isLoading || !user || items.length === 0 || notEnoughDp

  return (
    <main className="max-w-[1100px] mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-8">Cart</h1>

      <ul>
        {items.map((item) => (
          <CartItem key={item.id} item={item} />
        ))}
      </ul>

      <div className="mt-8 ml-auto max-w-sm flex flex-col gap-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Items</span>
          <span className="font-medium">{totalItems}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Total</span>
          <span className="font-bold">{totalPrice} DP</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Your balance</span>
          {isLoading ? (
            <span className="text-gray-400">…</span>
          ) : user ? (
            <span className="font-medium whitespace-nowrap">{formatDp(user.virtual_balance)} DP</span>
          ) : (
            <Link to="/login" className="font-medium underline">
              Log in to see your balance
            </Link>
          )}
        </div>

        {notEnoughDp && <p className="text-red-600 font-medium">Not enough DP</p>}

        <button
          type="button"
          disabled={checkoutDisabled}
          onClick={() => navigate('/checkout')}
          className="bg-gray-200 hover:bg-gray-300 rounded-full px-6 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200"
        >
          Checkout
        </button>
      </div>
    </main>
  )
}

export default CartPage
