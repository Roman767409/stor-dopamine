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
    <main className="px-4 py-16 flex justify-center">
      <div className="w-full max-w-[400px] border border-gray-200 rounded-xl p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-center">{title}</h1>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            />
            {fieldErrors.email && <p className="text-sm text-red-600">{fieldErrors.email}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            />
            {fieldErrors.password && (
              <p className="text-sm text-red-600">{fieldErrors.password}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-gray-200 hover:bg-gray-300 rounded-full px-6 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Loading...' : title}
          </button>
        </form>

        <p className="text-sm text-center text-gray-600">
          {isLogin ? 'Немає акаунта? ' : 'Вже є акаунт? '}
          <button type="button" onClick={toggleMode} className="font-medium text-gray-900 underline">
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </main>
  )
}

export default AuthPage
