// 403 screen: shown when a logged-in user opens a page they have no access to
import { Link } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import { btnSecondary } from '../utils/styles'

function ForbiddenPage() {
  return (
    <PageContainer>
      <div className="flex flex-col items-center text-center gap-4 py-16">
        <p className="text-6xl font-bold text-gray-300" aria-hidden="true">
          403
        </p>
        <h1 className="text-3xl font-bold">403, no access</h1>
        <p className="text-gray-600 max-w-md">This page is only available to administrators.</p>
        <Link to="/" className={`mt-2 ${btnSecondary}`}>
          Go to home
        </Link>
      </div>
    </PageContainer>
  )
}

export default ForbiddenPage
