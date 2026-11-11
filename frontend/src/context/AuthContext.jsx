import { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'

const API_URL = 'http://127.0.0.1:8000/api/auth'
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
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') {
    return detail
  }
  if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') {
    return detail[0].msg.replace(/^Value error, /, '')
  }
  return 'Something went wrong'
}

function fetchMe(accessToken) {
  return axios
    .get(`${API_URL}/me`, { headers: { Authorization: `Bearer ${accessToken}` } })
    .then((response) => response.data)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Завантаження потрібне лише тоді, коли є збережений токен, який треба перевірити
  const [isLoading, setIsLoading] = useState(() => readItem(ACCESS_KEY) !== null)

  // При завантаженні сторінки пробуємо відновити сесію за збереженими токенами
  useEffect(() => {
    let cancelled = false
    removeLegacyToken()

    const accessToken = readItem(ACCESS_KEY)
    if (!accessToken) return

    async function restore() {
      try {
        return await fetchMe(accessToken)
      } catch (error) {
        const refreshToken = readItem(REFRESH_KEY)
        // Access-токен прострочений — один раз пробуємо оновити пару токенів
        if (error.response?.status === 401 && refreshToken) {
          const response = await axios.post(`${API_URL}/refresh`, {
            refresh_token: refreshToken,
          })
          saveTokens(response.data)
          return await fetchMe(response.data.access_token)
        }
        throw error
      }
    }

    restore()
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

  async function login(email, password) {
    try {
      const response = await axios.post(`${API_URL}/login`, { email, password })
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
      await axios.post(`${API_URL}/register`, { email, password })
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
        await axios.post(`${API_URL}/logout`, { refresh_token: refreshToken })
      } catch {
        // Не вдалося відкликати токен на сервері — локально ми однаково вийшли
      }
    }
  }

  const value = { user, isLoading, register, login, logout }

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
