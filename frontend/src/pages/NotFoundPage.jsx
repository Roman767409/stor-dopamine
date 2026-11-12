// 404 screen for any unknown address
import { Link } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import { btnSecondary } from '../utils/styles'

function NotFoundPage() {
  return (
    <PageContainer>
      <div className="flex flex-col items-center text-center gap-4 py-16">
        <p className="text-6xl font-bold text-gray-300" aria-hidden="true">
          404
        </p>
        <h1 className="text-3xl font-bold">404, page not found</h1>
        <p className="text-gray-600 max-w-md">The page you are looking for does not exist.</p>
        <Link to="/" className={`mt-2 ${btnSecondary}`}>
          Go to home
        </Link>
      </div>
    </PageContainer>
  )
}

export default NotFoundPage
