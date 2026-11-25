// Profile screen: account info from GET /api/auth/me, balance reset and log out
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import ConfirmModal from '../components/ConfirmModal'
import PageContainer from '../components/PageContainer'
import { getErrorKey } from '../utils/apiErrors'
import { formatDp, formatLocalDate, toNumber } from '../utils/format'
import { btnPrimary, btnSecondary, cardClass } from '../utils/styles'

// Must match STARTING_BALANCE in backend/app/core/constants.py
const STARTING_BALANCE = 100000

function ProfilePage() {
  const { t } = useTranslation()
  const { user, logout, updateBalance, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  // Synchronous guard: two fast clicks happen before the disabled state renders
  const resetLockRef = useRef(false)
  // Result of the last reset: { key, isError }, key is a translation key ('' = no message)
  const [message, setMessage] = useState({ key: '', isError: false })

  // The user in the context may be stale (e.g. savings after new orders): reload it once
  useEffect(() => {
    const controller = new AbortController()
    refreshUser(controller.signal).catch(() => {
      // Keep showing the data already in the context
    })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when the page opens
  }, [])

  const balance = toNumber(user.virtual_balance)
  const isAtStart = balance >= STARTING_BALANCE

  async function handleConfirmReset() {
    if (resetLockRef.current) return
    resetLockRef.current = true
    setIsResetting(true)
    try {
      const response = await api.post('/api/users/me/balance/reset')
      updateBalance(response.data.virtual_balance)
      setMessage({ key: 'profile.resetDone', isError: false })
    } catch (error) {
      setMessage({ key: getErrorKey(error, 'profile.resetError'), isError: true })
    } finally {
      resetLockRef.current = false
      setIsResetting(false)
      setIsConfirmOpen(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  const startingAmount = formatDp(STARTING_BALANCE)

  const rows = [
    { key: 'profile.email', value: user.email },
    { key: 'profile.role', value: user.role === 'admin' ? t('profile.roleAdmin') : t('profile.roleClient') },
    { key: 'profile.balance', value: formatDp(balance) },
    { key: 'profile.totalSaved', value: formatDp(user.total_saved_amount) },
    { key: 'profile.registered', value: user.created_at ? formatLocalDate(user.created_at) : '—' },
  ]

  return (
    <PageContainer title={t('profile.title')}>
      <div className="max-w-xl flex flex-col gap-6">
        <dl className={`${cardClass} grid grid-cols-1 sm:grid-cols-2 gap-4`}>
          {rows.map((row) => (
            <div key={row.key} className="min-w-0">
              <dt className="text-xs text-gray-600">{t(row.key)}</dt>
              <dd className="font-medium break-words">{row.value}</dd>
            </div>
          ))}
        </dl>

        <p
          role="status"
          className={`text-sm font-medium min-h-5 ${message.isError ? 'text-red-600' : 'text-green-700'}`}
        >
          {message.key ? t(message.key) : ''}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => {
              setMessage({ key: '', isError: false })
              setIsConfirmOpen(true)
            }}
            disabled={isAtStart || isResetting}
            title={isAtStart ? t('profile.alreadyAtStart', { amount: startingAmount }) : undefined}
            aria-describedby={isAtStart ? 'reset-hint' : undefined}
            className={btnSecondary}
          >
            {t('profile.resetButton', { amount: startingAmount })}
          </button>
          <button type="button" onClick={handleLogout} className={btnPrimary}>
            {t('common.logOut')}
          </button>
        </div>
        {isAtStart && (
          <p id="reset-hint" className="-mt-3 text-xs text-gray-600">
            {t('profile.alreadyAtStartHint', { amount: startingAmount })}
          </p>
        )}
      </div>

      {isConfirmOpen && (
        <ConfirmModal
          title={t('profile.confirmTitle', { amount: startingAmount })}
          text={t('profile.confirmText')}
          confirmLabel={t('profile.confirmButton')}
          isBusy={isResetting}
          onConfirm={handleConfirmReset}
          onCancel={() => {
            if (!isResetting) setIsConfirmOpen(false)
          }}
        />
      )}
    </PageContainer>
  )
}

export default ProfilePage
