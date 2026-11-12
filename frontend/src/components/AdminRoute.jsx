// Route guard for the admin panel: like ProtectedRoute, but non-admins see the 403 page
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ForbiddenPage from '../pages/ForbiddenPage'
import LoadingSkeleton from './LoadingSkeleton'
import PageContainer from './PageContainer'

function AdminRoute({ children }) {
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

  if (user.role !== 'admin') {
    return <ForbiddenPage />
  }

  return children
}

export default AdminRoute
