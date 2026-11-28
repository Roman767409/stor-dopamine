// "My orders" screen: paginated list of the current user's orders from GET /api/orders
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingSkeleton from '../components/LoadingSkeleton'
import PageContainer from '../components/PageContainer'
import StatusBadge from '../components/StatusBadge'
import { getErrorKey } from '../utils/apiErrors'
import { isLanguageReload, makeRequestKey } from '../utils/requestKey'
import { formatDp, formatLocalDate } from '../utils/format'
import { btnSmall, cardClass } from '../utils/styles'

const PAGE_SIZE = 10

// Reads a positive page number from the URL, falling back to 1
function parsePage(value) {
  const page = Number.parseInt(value, 10)
  return Number.isInteger(page) && page >= 1 ? page : 1
}

function OrdersPage() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  // Page lives in the URL so "Back" from order details returns to the same page
  const page = parsePage(searchParams.get('page'))
  const [attempt, setAttempt] = useState(0)
  // Last server response together with the request key it belongs to (error is a translation key)
  const [result, setResult] = useState({ key: null, items: [], total: 0, error: null })

  // The language is part of the key so the list is fetched again after a switch
  const requestKey = makeRequestKey([page, attempt], i18n.language)
  // Loading until the stored response matches the current request;
  // after a language switch the current list stays on screen meanwhile
  const isLoading = result.key !== requestKey && !isLanguageReload(result.key, requestKey)

  function goToPage(nextPage) {
    setSearchParams(nextPage > 1 ? { page: String(nextPage) } : {})
  }

  useEffect(() => {
    // Ignore the response if the page changed while the request was in flight
    let cancelled = false
    const [requestPage] = JSON.parse(requestKey)

    api
      .get('/api/orders', { params: { page: requestPage, page_size: PAGE_SIZE } })
      .then((response) => {
        if (cancelled) return
        const { items, total } = response.data
        setResult({ key: requestKey, items, total, error: null })
        // Page is past the end (e.g. edited URL): jump to the last existing page
        const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
        if (requestPage > lastPage) {
          setSearchParams(lastPage > 1 ? { page: String(lastPage) } : {}, { replace: true })
        }
      })
      .catch((error) => {
        if (cancelled) return
        setResult({
          key: requestKey,
          items: [],
          total: 0,
          error: getErrorKey(error, 'orders.loadError'),
        })
      })

    return () => {
      cancelled = true
    }
  }, [requestKey, setSearchParams])

  const { items: orders, total, error } = result
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <PageContainer title={t('orders.title')}>
      {isLoading && <LoadingSkeleton variant="list" />}

      {!isLoading && error && (
        <ErrorState message={t(error)} onRetry={() => setAttempt((value) => value + 1)} />
      )}

      {!isLoading && !error && orders.length === 0 && (
        <EmptyState
          title={t('orders.emptyTitle')}
          text={t('orders.emptyText')}
          actionLabel={t('common.goToShop')}
          onAction={() => navigate('/shop')}
        />
      )}

      {!isLoading && !error && orders.length > 0 && (
        <>
          <ul className="flex flex-col gap-4">
            {orders.map((order) => (
              <li
                key={order.order_id}
                className={`${cardClass} flex flex-col md:flex-row md:items-center gap-4 md:gap-6`}
              >
                <dl className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:items-center">
                  <div>
                    <dt className="text-xs text-gray-600">{t('orders.date')}</dt>
                    <dd className="font-medium">{formatLocalDate(order.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-600">{t('common.trackingNumber')}</dt>
                    <dd className="font-medium break-all">{order.tracking_number}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-600">{t('common.total')}</dt>
                    <dd className="font-bold whitespace-nowrap">{formatDp(order.total_price)}</dd>
                    <dd className="text-xs text-gray-600">
                      {t('common.itemsCount', { count: order.items_count })}
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">{t('common.status')}</dt>
                    <dd>
                      <StatusBadge status={order.status} />
                    </dd>
                  </div>
                </dl>
                <div className="flex gap-2 shrink-0">
                  <Link
                    to={`/orders/${order.order_id}`}
                    className={`flex-1 text-center ${btnSmall}`}
                  >
                    {t('orders.details')}
                  </Link>
                  {/* Same as the success page: the order goes in state for the tracking screen */}
                  <Link
                    to={`/tracking/${order.tracking_number}`}
                    state={{ order }}
                    className={`flex-1 text-center ${btnSmall}`}
                  >
                    {t('orders.track')}
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav aria-label={t('common.pagination')} className="mt-10 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className={btnSmall}
              >
                {t('common.previous')}
              </button>
              <span className="text-sm font-medium">
                {t('common.pageOf', { page, total: totalPages })}
              </span>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className={btnSmall}
              >
                {t('common.next')}
              </button>
            </nav>
          )}
        </>
      )}
    </PageContainer>
  )
}

export default OrdersPage
