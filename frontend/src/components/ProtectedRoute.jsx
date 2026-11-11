// Route guard: skeleton while the session is checked, guests go to /login
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSkeleton from './LoadingSkeleton'
import PageContainer from './PageContainer'

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingSkeleton variant="list" />
      </PageContainer>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
