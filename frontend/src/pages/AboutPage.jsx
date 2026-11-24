// "About us" screen: what DopamineStore is and how it works
import { useTranslation } from 'react-i18next'
import PageContainer from '../components/PageContainer'
import { formatDp } from '../utils/format'

// Must match STARTING_BALANCE in backend/app/core/constants.py
const STARTING_BALANCE = 100000

function AboutPage() {
  const { t } = useTranslation()
  return (
    <PageContainer title={t('about.title')}>
      <div className="max-w-2xl flex flex-col gap-4 text-gray-600">
        <p>{t('about.p1')}</p>
        <p>{t('about.p2', { amount: formatDp(STARTING_BALANCE) })}</p>
        <p>{t('about.p3')}</p>
      </div>
    </PageContainer>
  )
}

export default AboutPage
