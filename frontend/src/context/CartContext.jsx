import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

const MIN_QUANTITY = 1
const MAX_QUANTITY = 99

const CartContext = createContext(null)

// Обмежує кількість діапазоном 1..99 і робить її цілим числом
function clampQuantity(quantity) {
  const number = Math.round(Number(quantity))
  if (Number.isNaN(number)) return MIN_QUANTITY
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, number))
}

// Ключ кошика в localStorage; для гостя або під час перевірки сесії ключа немає
function getStorageKey(user, isLoading) {
  if (isLoading || !user) return null
  return `cart:${user.id}`
}

// Читає кошик із localStorage; якщо щось не так, повертає порожній кошик
function loadCart(storageKey) {
  if (!storageKey) return []
  try {
    const saved = localStorage.getItem(storageKey)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const { user, isLoading } = useAuth()
  const storageKey = getStorageKey(user, isLoading)

  // Ключ і список позицій лежать РАЗОМ: так кошик завжди знає, чий він
  const [cart, setCart] = useState(() => ({
    key: storageKey,
    items: loadCart(storageKey),
  }))

  // Користувач змінився (вхід, вихід, інший акаунт) — одразу, ще під час
  // малювання, підміняємо кошик на кошик нового власника.
  // React перемалює компонент до того, як спрацює будь-який useEffect.
  if (cart.key !== storageKey) {
    setCart({ key: storageKey, items: loadCart(storageKey) })
  }

  // Зберігаємо кошик під ключем ЙОГО власника; гостьовий кошик не зберігаємо
  useEffect(() => {
    if (!cart.key) return
    try {
      localStorage.setItem(cart.key, JSON.stringify(cart.items))
    } catch {
      // Сховище недоступне (наприклад, приватний режим) — кошик просто не збережеться
    }
  }, [cart])

  // Змінює позиції лише тоді, коли кошик комусь належить; для гостя нічого не робить
  function updateItems(change) {
    setCart((prev) => (prev.key ? { ...prev, items: change(prev.items) } : prev))
  }

  function addToCart(product) {
    updateItems((prevItems) => {
      const existing = prevItems.find((item) => item.id === product.id)
      if (existing) {
        return prevItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: clampQuantity(item.quantity + 1) }
            : item
        )
      }
      return [...prevItems, { ...product, quantity: 1 }]
    })
  }

  function removeFromCart(id) {
    updateItems((prevItems) => prevItems.filter((item) => item.id !== id))
  }

  function setQuantity(id, quantity) {
    updateItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, quantity: clampQuantity(quantity) } : item
      )
    )
  }

  function clearCart() {
    updateItems(() => [])
  }

  // Поки кошик не підмінено на кошик поточного власника, показуємо порожній
  const items = cart.key === storageKey ? cart.items : []
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price_dp * item.quantity, 0)

  const value = {
    items,
    addToCart,
    removeFromCart,
    setQuantity,
    clearCart,
    totalItems,
    totalPrice,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// Хук живе поруч із провайдером, щоб усе про кошик було в одному файлі
// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used inside <CartProvider>')
  }
  return context
}
