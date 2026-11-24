// 403 screen: shown when a logged-in user opens a page they have no access to
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import { btnSecondary } from '../utils/styles'

function ForbiddenPage() {
  const { t } = useTranslation()
  return (
    <PageContainer>
      <div className="flex flex-col items-center text-center gap-4 py-16">
        <p className="text-6xl font-bold text-gray-300" aria-hidden="true">
          403
        </p>
        <h1 className="text-3xl font-bold">{t('forbidden.title')}</h1>
        <p className="text-gray-600 max-w-md">{t('forbidden.text')}</p>
        <Link to="/" className={`mt-2 ${btnSecondary}`}>
          {t('common.goHome')}
        </Link>
      </div>
    </PageContainer>
  )
}

export default ForbiddenPage
