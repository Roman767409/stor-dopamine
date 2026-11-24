import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getApiError, getErrorKey } from '../utils/apiErrors'

const MIN_PASSWORD_LENGTH = 8

// Translation key for a failed login or registration.
// On registration VALIDATION_ERROR means the email or password breaks the server rules.
function authErrorKey(error, isLogin) {
  if (!isLogin && getApiError(error)?.code === 'VALIDATION_ERROR') return 'auth.registerInvalid'
  return getErrorKey(error)
}

function AuthPage() {
  const { t } = useTranslation()
  const { user, isLoading, login, register } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login') // 'login' or 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Errors are translation keys, translated while rendering
  const [fieldErrors, setFieldErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isLogin = mode === 'login'
  const submitLabel = isLogin ? t('common.logIn') : t('auth.signUp')

  // The form is hidden while the saved session is checked
  if (isLoading) {
    return <p className="text-center py-10">{t('common.loading')}</p>
  }

  // Already logged in: nothing to do on this page
  if (user) {
    return <Navigate to="/shop" replace />
  }

  function validate() {
    const errors = {}
    if (email.trim() === '') {
      errors.email = 'auth.emailRequired'
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = 'auth.passwordTooShort'
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
      setServerError(authErrorKey(error, isLogin))
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
        {/* Image placeholder, hidden on phones */}
        <div className="hidden md:block md:w-1/2 min-h-[440px] bg-gray-300 rounded-2xl" />

        <div className="w-full md:w-1/2 px-4 py-10 md:px-10 flex flex-col justify-center gap-10">
          <div className="text-center">
            <h1 className="text-3xl font-bold">{isLogin ? t('auth.welcome') : t('auth.signUpTitle')}</h1>
            <p className="mt-2 text-xs text-gray-700">{t('auth.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="sr-only">
                {t('auth.email')}
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
              {fieldErrors.email && (
                <p className="text-sm text-red-600">{t(fieldErrors.email)}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-xs text-gray-700">
                {t('auth.password')}
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
                <p className="text-sm text-red-600">
                  {t(fieldErrors.password, { count: MIN_PASSWORD_LENGTH })}
                </p>
              )}
              <button type="button" className="self-end mt-2 text-xs text-gray-700 hover:underline">
                {t('auth.forgotPassword')}
              </button>
            </div>

            {serverError && <p className="text-sm text-red-600">{t(serverError)}</p>}

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gray-900 hover:bg-gray-700 text-white rounded-full px-6 py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t('common.loading') : submitLabel}
              </button>

              {isLogin && (
                <button
                  type="button"
                  className="w-full bg-gray-300 hover:bg-gray-400 rounded-full px-6 py-3 text-sm font-medium"
                >
                  {t('auth.googleLogin')}
                </button>
              )}
            </div>
          </form>

          <p className="text-sm text-center text-gray-600">
            {isLogin ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
            <button type="button" onClick={toggleMode} className="font-medium text-gray-900 underline">
              {isLogin ? t('auth.signUp') : t('common.logIn')}
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}

export default AuthPage
