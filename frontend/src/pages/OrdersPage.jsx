// "My orders" screen: paginated list of the current user's orders from GET /api/orders
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingSkeleton from '../components/LoadingSkeleton'
import PageContainer from '../components/PageContainer'
import StatusBadge from '../components/StatusBadge'
import { formatDp, formatLocalDate } from '../utils/format'
import { btnSmall, cardClass } from '../utils/styles'

const PAGE_SIZE = 10

// Reads a positive page number from the URL, falling back to 1
function parsePage(value) {
  const page = Number.parseInt(value, 10)
  return Number.isInteger(page) && page >= 1 ? page : 1
}

function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  // Page lives in the URL so "Back" from order details returns to the same page
  const page = parsePage(searchParams.get('page'))
  const [attempt, setAttempt] = useState(0)
  // Last server response together with the request key it belongs to
  const [result, setResult] = useState({ key: null, items: [], total: 0, error: null })

  const requestKey = JSON.stringify([page, attempt])
  // Loading until the stored response matches the current request
  const isLoading = result.key !== requestKey

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
          error: error.response?.data?.error?.message || 'Could not load orders',
        })
      })

    return () => {
      cancelled = true
    }
  }, [requestKey, setSearchParams])

  const { items: orders, total, error } = result
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <PageContainer title="My orders">
      {isLoading && <LoadingSkeleton variant="list" />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} />
      )}

      {!isLoading && !error && orders.length === 0 && (
        <EmptyState
          title="No orders yet"
          text="Your orders will appear here after checkout."
          actionLabel="Go to shop"
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
                    <dt className="text-xs text-gray-600">Date</dt>
                    <dd className="font-medium">{formatLocalDate(order.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-600">Tracking number</dt>
                    <dd className="font-medium break-all">{order.tracking_number}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-600">Total</dt>
                    <dd className="font-bold whitespace-nowrap">{formatDp(order.total_price)} DP</dd>
                    <dd className="text-xs text-gray-600">
                      {order.items_count} {order.items_count === 1 ? 'item' : 'items'}
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">Status</dt>
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
                    Details
                  </Link>
                  {/* Same as the success page: the order goes in state for the tracking screen */}
                  <Link
                    to={`/tracking/${order.tracking_number}`}
                    state={{ order }}
                    className={`flex-1 text-center ${btnSmall}`}
                  >
                    Track
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className={btnSmall}
              >
                Previous
              </button>
              <span className="text-sm font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className={btnSmall}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </PageContainer>
  )
}

export default OrdersPage
