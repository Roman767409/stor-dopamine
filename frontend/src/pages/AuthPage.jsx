import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const MIN_PASSWORD_LENGTH = 8

function AuthPage() {
  const { user, isLoading, login, register } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login') // 'login' або 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isLogin = mode === 'login'
  const title = isLogin ? 'Log in' : 'Sign up'

  // Поки перевіряється збережена сесія, форму не показуємо
  if (isLoading) {
    return <p className="text-center py-10">Loading...</p>
  }

  // Уже увійшли — на цій сторінці робити нічого
  if (user) {
    return <Navigate to="/shop" replace />
  }

  function validate() {
    const errors = {}
    if (email.trim() === '') {
      errors.email = 'Enter your email'
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    }
    return errors
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError('')

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    try {
      if (isLogin) {
        await login(email.trim(), password)
      } else {
        await register(email.trim(), password)
      }
      navigate('/shop', { replace: true })
    } catch (error) {
      setServerError(error.message)
      setIsSubmitting(false)
    }
  }

  function toggleMode() {
    setMode(isLogin ? 'register' : 'login')
    setServerError('')
    setFieldErrors({})
  }

  return (
    <main className="min-h-screen bg-gray-300 px-4 py-16 flex items-center justify-center">
      <div className="w-full max-w-[900px] bg-white rounded-3xl p-4 md:p-6 flex gap-6">
        {/* Заглушка для картинки — на телефоні ховається */}
        <div className="hidden md:block md:w-1/2 min-h-[440px] bg-gray-300 rounded-2xl" />

        <div className="w-full md:w-1/2 px-4 py-10 md:px-10 flex flex-col justify-center gap-10">
          <div className="text-center">
            <h1 className="text-3xl font-bold">{isLogin ? 'Welcome!' : 'Sign up'}</h1>
            <p className="mt-2 text-xs text-gray-700">Enter Your Details Below</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="youremail@gmail.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="bg-transparent border-0 border-b border-gray-400 py-2 text-sm outline-none focus:border-gray-900"
              />
              {fieldErrors.email && <p className="text-sm text-red-600">{fieldErrors.email}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-xs text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="bg-transparent border-0 border-b border-gray-400 py-1 text-sm outline-none focus:border-gray-900"
              />
              {fieldErrors.password && (
                <p className="text-sm text-red-600">{fieldErrors.password}</p>
              )}
              <button type="button" className="self-end mt-2 text-xs text-gray-700 hover:underline">
                Forgot password?
              </button>
            </div>

            {serverError && <p className="text-sm text-red-600">{serverError}</p>}

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gray-900 hover:bg-gray-700 text-white rounded-full px-6 py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Loading...' : title}
              </button>

              {isLogin && (
                <button
                  type="button"
                  className="w-full bg-gray-300 hover:bg-gray-400 rounded-full px-6 py-3 text-sm font-medium"
                >
                  Log in with Google
                </button>
              )}
            </div>
          </form>

          <p className="text-sm text-center text-gray-600">
            {isLogin ? 'Немає акаунта? ' : 'Вже є акаунт? '}
            <button type="button" onClick={toggleMode} className="font-medium text-gray-900 underline">
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}

export default AuthPage
