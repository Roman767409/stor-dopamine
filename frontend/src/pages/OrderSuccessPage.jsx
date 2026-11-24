// Order success screen: animated check mark, tracking number, total and new balance
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import { formatDp } from '../utils/format'
import { btnPrimary, btnSecondary, cardClass } from '../utils/styles'

function OrderSuccessPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const order = location.state?.order
  const newBalance = location.state?.newBalance

  // Opened directly, without an order from the checkout
  if (!order) {
    return <Navigate to="/shop" replace />
  }

  return (
    <PageContainer>
      <div className="max-w-md mx-auto flex flex-col items-center text-center gap-6 py-6">
        <div
          className="w-24 h-24 rounded-full bg-green-400 flex items-center justify-center transition duration-500 ease-out starting:scale-50 starting:opacity-0"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold">{t('orders.success.title')}</h1>

        <dl className={`w-full ${cardClass} flex flex-col gap-3 text-left`}>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-600">{t('common.trackingNumber')}</dt>
            <dd className="font-semibold break-all text-right">{order.tracking_number}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-600">{t('common.total')}</dt>
            <dd className="font-bold whitespace-nowrap">{formatDp(order.total_price)}</dd>
          </div>
          {newBalance !== undefined && (
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">{t('orders.success.newBalance')}</dt>
              <dd className="font-medium whitespace-nowrap">{formatDp(newBalance)}</dd>
            </div>
          )}
        </dl>

        <div className="w-full flex flex-col sm:flex-row gap-3">
          <Link
            to={`/tracking/${order.tracking_number}`}
            state={{ order }}
            className={`flex-1 text-center ${btnPrimary}`}
          >
            {t('common.trackParcel')}
          </Link>
          <Link to="/shop" className={`flex-1 text-center ${btnSecondary}`}>
            {t('orders.success.continueShopping')}
          </Link>
        </div>
      </div>
    </PageContainer>
  )
}

export default OrderSuccessPage
