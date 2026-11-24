// Notice shown when the free-hosted backend takes long to answer the first request
import { useTranslation } from 'react-i18next'

function ServerWakingBanner() {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      className="mb-6 flex items-center gap-3 bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm"
    >
      <span
        className="shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin"
        aria-hidden="true"
      />
      <p>{t('common.serverWaking')}</p>
    </div>
  )
}

export default ServerWakingBanner
