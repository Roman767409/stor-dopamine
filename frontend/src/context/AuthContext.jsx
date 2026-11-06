import { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'

const API_URL = 'http://127.0.0.1:8000/api/auth'
const STORAGE_KEY = 'token'

const AuthContext = createContext(null)

function readToken() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function saveToken(token) {
  try {
    localStorage.setItem(STORAGE_KEY, token)
  } catch {
    // Сховище недоступне — після перезавантаження доведеться увійти знову
  }
}

function removeToken() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Нічого не робимо: токена в сховищі однаково немає або воно недоступне
  }
}

// Перетворює помилку axios на зрозумілий текст
function getErrorMessage(error) {
  if (!error.response) {
    return "Не вдалося зв'язатися із сервером"
  }
  const detail = error.response.data?.detail
  if (typeof detail === 'string') {
    return detail
  }
  if (Array.isArray(detail) && detail[0]?.msg) {
    return detail[0].msg
  }
  return 'Щось пішло не так, спробуйте ще раз'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  // Завантаження потрібне лише тоді, коли є збережений токен, який треба перевірити
  const [isLoading, setIsLoading] = useState(() => readToken() !== null)

  // При завантаженні сторінки пробуємо відновити сесію за збереженим токеном
  useEffect(() => {
    let cancelled = false
    const savedToken = readToken()

    if (!savedToken) return

    axios
      .get(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
      .then((response) => {
        if (cancelled) return
        setToken(savedToken)
        setUser(response.data)
      })
      .catch((error) => {
        if (cancelled) return
        // Сервер відповів помилкою (наприклад, 401) — токен недійсний, видаляємо.
        // Якщо сервер просто недоступний, токен лишаємо: спробуємо при наступному завантаженні.
        if (error.response) {
          removeToken()
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Спільна логіка для входу і реєстрації
  async function authenticate(path, email, password) {
    try {
      const response = await axios.post(`${API_URL}/${path}`, { email, password })
      const { token: newToken, user: newUser } = response.data
      saveToken(newToken)
      setToken(newToken)
      setUser(newUser)
      return newUser
    } catch (error) {
      throw new Error(getErrorMessage(error), { cause: error })
    }
  }

  function register(email, password) {
    return authenticate('register', email, password)
  }

  function login(email, password) {
    return authenticate('login', email, password)
  }

  function logout() {
    removeToken()
    setToken(null)
    setUser(null)
  }

  const value = { user, token, isLoading, register, login, logout }

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
