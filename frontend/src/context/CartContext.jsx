import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'cart'
const MIN_QUANTITY = 1
const MAX_QUANTITY = 99

const CartContext = createContext(null)

// Обмежує кількість діапазоном 1..99 і робить її цілим числом
function clampQuantity(quantity) {
  const number = Math.round(Number(quantity))
  if (Number.isNaN(number)) return MIN_QUANTITY
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, number))
}

// Читає кошик із localStorage; якщо щось не так, повертає порожній кошик
function loadCart() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart)

  // Після кожної зміни кошика зберігаємо його в localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Сховище недоступне (наприклад, приватний режим) — кошик просто не збережеться
    }
  }, [items])

  function addToCart(product) {
    setItems((prevItems) => {
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
    setItems((prevItems) => prevItems.filter((item) => item.id !== id))
  }

  function setQuantity(id, quantity) {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, quantity: clampQuantity(quantity) } : item
      )
    )
  }

  function clearCart() {
    setItems([])
  }

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
