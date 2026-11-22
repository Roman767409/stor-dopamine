import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api'

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'
const LEGACY_KEY = 'token'

const AuthContext = createContext(null)

function readItem(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function saveTokens({ access_token, refresh_token }) {
  try {
    localStorage.setItem(ACCESS_KEY, access_token)
    localStorage.setItem(REFRESH_KEY, refresh_token)
  } catch {
    // Сховище недоступне — після перезавантаження доведеться увійти знову
  }
}

function clearTokens() {
  try {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  } catch {
    // Сховище недоступне — токенів у ньому однаково немає
  }
}

// Старий формат зберігав один токен під ключем `token` — прибираємо його
function removeLegacyToken() {
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    // Нічого не робимо
  }
}

// Перетворює помилку axios на зрозумілий текст
function getErrorMessage(error) {
  const data = error?.response?.data?.error
  if (data?.code === 'VALIDATION_ERROR' && data.details?.[0]?.message) {
    return data.details[0].message
  }
  if (data?.message) {
    return data.message
  }
  return 'Something went wrong'
}

// Токен зі сховища додає інтерцептор; явний токен потрібен одразу після входу,
// якщо сховище недоступне
function fetchMe(accessToken) {
  const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
  return api.get('/api/auth/me', config).then((response) => response.data)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Завантаження потрібне лише тоді, коли є збережений токен, який треба перевірити
  const [isLoading, setIsLoading] = useState(() => readItem(ACCESS_KEY) !== null)

  // При завантаженні сторінки пробуємо відновити сесію за збереженими токенами
  useEffect(() => {
    let cancelled = false
    removeLegacyToken()

    if (!readItem(ACCESS_KEY)) return

    // Якщо access-токен прострочений, пару токенів оновить інтерцептор у api.js
    fetchMe()
      .then((me) => {
        if (!cancelled) setUser(me)
      })
      .catch((error) => {
        if (cancelled) return
        // Сервер відповів помилкою — токени недійсні, видаляємо.
        // Якщо сервер просто недоступний, токени лишаємо: спробуємо при наступному завантаженні.
        if (error.response) {
          clearTokens()
        }
        setUser(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Інтерцептор не зміг оновити токени — сесія закінчилась, скидаємо користувача
  useEffect(() => {
    function handleForcedLogout() {
      setUser(null)
    }
    window.addEventListener('auth:logout', handleForcedLogout)
    return () => window.removeEventListener('auth:logout', handleForcedLogout)
  }, [])

  async function login(email, password) {
    try {
      const response = await api.post('/api/auth/login', { email, password })
      saveTokens(response.data)
      const me = await fetchMe(response.data.access_token)
      setUser(me)
      return me
    } catch (error) {
      throw new Error(getErrorMessage(error), { cause: error })
    }
  }

  async function register(email, password) {
    try {
      await api.post('/api/auth/register', { email, password })
    } catch (error) {
      throw new Error(getErrorMessage(error), { cause: error })
    }
    return login(email, password)
  }

  async function logout() {
    const refreshToken = readItem(REFRESH_KEY)
    clearTokens()
    setUser(null)
    if (refreshToken) {
      try {
        await api.post('/api/auth/logout', { refresh_token: refreshToken })
      } catch {
        // Не вдалося відкликати токен на сервері — локально ми однаково вийшли
      }
    }
  }

  // Sets the balance returned by the server (e.g. after checkout) so the Header updates at once
  function updateBalance(newBalance) {
    setUser((prev) => (prev ? { ...prev, virtual_balance: newBalance } : prev))
  }

  // Reloads the current user from GET /api/auth/me (fresh balance, savings, created_at).
  // The answer is ignored if the user logged out while the request was in flight.
  async function refreshUser(signal) {
    const me = await api.get('/api/auth/me', { signal }).then((response) => response.data)
    setUser((prev) => (prev && prev.id === me.id ? me : prev))
    return me
  }

  const value = { user, isLoading, register, login, logout, updateBalance, refreshUser }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Хук живе поруч із провайдером, щоб усе про вхід було в одному файлі
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return context
}
