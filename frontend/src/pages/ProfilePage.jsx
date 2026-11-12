// Profile screen: account info, balance reset (demo confirmation only) and log out
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ConfirmModal from '../components/ConfirmModal'
import PageContainer from '../components/PageContainer'
import { mockProfile } from '../mocks/mockData'
import { formatDate, formatDp } from '../utils/format'
import { btnPrimary, btnSecondary, cardClass } from '../utils/styles'

function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [message, setMessage] = useState('')

  function handleConfirmReset() {
    // Demo only: the user's balance is not changed
    setIsConfirmOpen(false)
    setMessage('Balance reset (demo)')
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  const rows = [
    { label: 'Email', value: user.email },
    { label: 'Role', value: user.role === 'admin' ? 'Admin' : 'Client' },
    { label: 'Balance', value: `${formatDp(user.virtual_balance)} DP` },
    { label: 'Total saved', value: `${formatDp(user.total_saved_amount)} DP` },
    { label: 'Registered', value: formatDate(mockProfile.registered_at) },
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

        <p role="status" className="text-sm font-medium text-green-700 min-h-5">
          {message}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={() => setIsConfirmOpen(true)} className={btnSecondary}>
            Reset balance to 100 000 DP
          </button>
          <button type="button" onClick={handleLogout} className={btnPrimary}>
            Log out
          </button>
        </div>
      </div>

      {isConfirmOpen && (
        <ConfirmModal
          title="Reset balance?"
          text="Your balance will be set back to 100 000 DP. Your orders and savings stay as they are."
          confirmLabel="Reset balance"
          onConfirm={handleConfirmReset}
          onCancel={() => setIsConfirmOpen(false)}
        />
      )}
    </PageContainer>
  )
}

export default ProfilePage
