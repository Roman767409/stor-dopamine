// Profile screen: account info from GET /api/auth/me, balance reset and log out
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import ConfirmModal from '../components/ConfirmModal'
import PageContainer from '../components/PageContainer'
import { getApiError } from '../utils/apiErrors'
import { formatDate, formatDp, toNumber } from '../utils/format'
import { btnPrimary, btnSecondary, cardClass } from '../utils/styles'

// Must match STARTING_BALANCE in backend/app/core/constants.py
const STARTING_BALANCE = 100000

// Text for a failed reset request
function resetErrorMessage(error) {
  const apiError = getApiError(error)
  if (apiError?.code === 'NOTHING_TO_RESET') {
    return 'Your balance is already at the starting amount'
  }
  return apiError?.message || 'Could not reset the balance'
}

function ProfilePage() {
  const { user, logout, updateBalance, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  // Synchronous guard: two fast clicks happen before the disabled state renders
  const resetLockRef = useRef(false)
  // Result of the last reset: { text, isError }
  const [message, setMessage] = useState({ text: '', isError: false })

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
      setMessage({ text: 'Balance reset', isError: false })
    } catch (error) {
      setMessage({ text: resetErrorMessage(error), isError: true })
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

  const rows = [
    { label: 'Email', value: user.email },
    { label: 'Role', value: user.role === 'admin' ? 'Admin' : 'Client' },
    { label: 'Balance', value: `${formatDp(balance)} DP` },
    { label: 'Total saved', value: `${formatDp(user.total_saved_amount)} DP` },
    { label: 'Registered', value: user.created_at ? formatDate(user.created_at) : '—' },
  ]

  return (
    <PageContainer title="Profile">
      <div className="max-w-xl flex flex-col gap-6">
        <dl className={`${cardClass} grid grid-cols-1 sm:grid-cols-2 gap-4`}>
          {rows.map((row) => (
            <div key={row.label} className="min-w-0">
              <dt className="text-xs text-gray-600">{row.label}</dt>
              <dd className="font-medium break-words">{row.value}</dd>
            </div>
          ))}
        </dl>

        <p
          role="status"
          className={`text-sm font-medium min-h-5 ${message.isError ? 'text-red-600' : 'text-green-700'}`}
        >
          {message.text}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => {
              setMessage({ text: '', isError: false })
              setIsConfirmOpen(true)
            }}
            disabled={isAtStart || isResetting}
            title={isAtStart ? 'Your balance is already 100 000 DP' : undefined}
            aria-describedby={isAtStart ? 'reset-hint' : undefined}
            className={btnSecondary}
          >
            Reset balance to 100 000 DP
          </button>
          <button type="button" onClick={handleLogout} className={btnPrimary}>
            Log out
          </button>
        </div>
        {isAtStart && (
          <p id="reset-hint" className="-mt-3 text-xs text-gray-600">
            Your balance is already 100 000 DP, there is nothing to reset.
          </p>
        )}
      </div>

      {isConfirmOpen && (
        <ConfirmModal
          title="Reset your balance to 100 000 DP?"
          text="Your orders and savings stay as they are."
          confirmLabel="Reset balance"
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
