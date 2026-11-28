// Спільний axios-клієнт: адреса бекенду, заголовок Authorization та авто-refresh при 401
import axios from 'axios'
import i18n, { DEFAULT_LANGUAGE } from './i18n'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const LANGUAGE_HEADER = 'Accept-Language'
const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'
// Для цих маршрутів 401 означає «невірні дані», а не «прострочений токен»
const NO_REFRESH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh']

const api = axios.create({ baseURL: BASE_URL })

// Проміс поточного refresh: спільний для всіх запитів, що одночасно отримали 401
let refreshPromise = null

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

// Видаляє токени й повідомляє застосунок, що сесія закінчилась
function forceLogout() {
  try {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  } catch {
    // Сховище недоступне — токенів у ньому однаково немає
  }
  window.dispatchEvent(new Event('auth:logout'))
}

// Оновлює пару токенів через чистий axios, щоб не зациклити інтерцептор
function refreshTokens(refreshToken) {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${BASE_URL}/api/auth/refresh`, { refresh_token: refreshToken })
      .then((response) => {
        saveTokens(response.data)
        return response.data.access_token
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

api.interceptors.request.use((config) => {
  const accessToken = readItem(ACCESS_KEY)
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  // The backend localizes product and category names by this header.
  // The UI language is read at request time, so a retry after the token refresh
  // (which passes through here again) uses the current language too.
  // A language set explicitly by the caller is kept (e.g. caches keyed by language).
  if (config._autoLanguage || !config.headers.has(LANGUAGE_HEADER)) {
    config.headers.set(LANGUAGE_HEADER, i18n.language || DEFAULT_LANGUAGE)
    config._autoLanguage = true
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const url = original?.url || ''
    const canRefresh =
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !NO_REFRESH_PATHS.some((path) => url.startsWith(path))

    if (!canRefresh) {
      return Promise.reject(error)
    }
    original._retry = true

    // Якщо refresh уже йде, приєднуємось до нього й не читаємо токен повторно
    const refreshToken = readItem(REFRESH_KEY)
    if (!refreshPromise && !refreshToken) {
      forceLogout()
      return Promise.reject(error)
    }

    let accessToken
    try {
      accessToken = await refreshTokens(refreshToken)
    } catch {
      forceLogout()
      return Promise.reject(error)
    }

    original.headers.Authorization = `Bearer ${accessToken}`
    return api(original)
  }
)

export default api
