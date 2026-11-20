// Order details from GET /api/orders/{order_id}: items, shipping address, tracking number, status and total
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingSkeleton from '../components/LoadingSkeleton'
import PageContainer from '../components/PageContainer'
import StatusBadge from '../components/StatusBadge'
import { formatDp, formatLocalDate } from '../utils/format'
import { btnSecondary, cardClass, focusRing } from '../utils/styles'

// 404 ORDER_NOT_FOUND (missing or someone else's order) or 422 (id is not a UUID)
function isNotFound(error) {
  const status = error.response?.status
  return (
    (status === 404 && error.response?.data?.error?.code === 'ORDER_NOT_FOUND') ||
    status === 422
  )
}

function OrderDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(0)
  // Last server response together with the request key it belongs to
  const [result, setResult] = useState({ key: null, order: null, notFound: false, error: null })

  const requestKey = JSON.stringify([id, attempt])
  const isLoading = result.key !== requestKey

  useEffect(() => {
    // Ignore the response if the route changed while the request was in flight
    let cancelled = false
    const [orderId] = JSON.parse(requestKey)

    api
      .get(`/api/orders/${encodeURIComponent(orderId)}`)
      .then((response) => {
        if (cancelled) return
        setResult({ key: requestKey, order: response.data, notFound: false, error: null })
      })
      .catch((error) => {
        if (cancelled) return
        setResult({
          key: requestKey,
          order: null,
          notFound: isNotFound(error),
          error: error.response?.data?.error?.message || 'Could not load the order',
        })
      })

    return () => {
      cancelled = true
    }
  }, [requestKey])

  if (isLoading) {
    return (
      <PageContainer title="Order details">
        <LoadingSkeleton variant="list" count={3} />
      </PageContainer>
    )
  }

  if (result.notFound) {
    return (
      <PageContainer>
        <EmptyState
          title="Order not found"
          text="Check the link or open the order from your orders list."
          actionLabel="Back to orders"
          onAction={() => navigate('/orders')}
        />
      </PageContainer>
    )
  }

  if (result.error) {
    return (
      <PageContainer title="Order details">
        <ErrorState message={result.error} onRetry={() => setAttempt((value) => value + 1)} />
      </PageContainer>
    )
  }

  const { order } = result
  const address = order.shipping_address

  return (
    <PageContainer>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">Order details</h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2" aria-label="Items">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-gray-200 text-xs text-gray-600">
              <tr>
                <th scope="col" className="py-3 pr-4 font-medium">
                  Product
                </th>
                <th scope="col" className="py-3 px-2 font-medium text-right">
                  Qty
                </th>
                <th scope="col" className="hidden sm:table-cell py-3 px-2 font-medium text-right">
                  Price
                </th>
                <th scope="col" className="py-3 pl-2 font-medium text-right">
                  Sum
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.product_id} className="border-b border-gray-200">
                  <td className="py-4 pr-4">
                    <span className="font-medium break-words">{item.title}</span>
                    <span className="block sm:hidden text-xs text-gray-600">
                      {formatDp(item.price_at_purchase)} DP each
                    </span>
                  </td>
                  <td className="py-4 px-2 text-right">{item.quantity}</td>
                  <td className="hidden sm:table-cell py-4 px-2 text-right whitespace-nowrap">
                    {formatDp(item.price_at_purchase)} DP
                  </td>
                  <td className="py-4 pl-2 text-right whitespace-nowrap">
                    {formatDp(item.line_total)} DP
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-end gap-6 text-base">
            <span className="text-gray-600">Total</span>
            <span className="font-bold whitespace-nowrap">{formatDp(order.total_price)} DP</span>
          </div>
        </section>

        <aside className={`${cardClass} flex flex-col gap-5 self-start text-sm`}>
          <div>
            <h2 className="text-xs text-gray-600">Tracking number</h2>
            <Link
              to={`/tracking/${order.tracking_number}`}
              state={{ order }}
              className={`font-semibold underline break-all rounded ${focusRing}`}
            >
              {order.tracking_number}
            </Link>
          </div>
          <div>
            <h2 className="text-xs text-gray-600">Status</h2>
            <StatusBadge status={order.status} />
          </div>
          <div>
            <h2 className="text-xs text-gray-600">Ordered on</h2>
            <p className="font-medium">{formatLocalDate(order.created_at)}</p>
          </div>
          <div>
            <h2 className="text-xs text-gray-600">Shipping address</h2>
            <address className="not-italic font-medium">
              {address.full_name}
              <br />
              {address.line1}
              <br />
              {address.postal_code} {address.city}
              <br />
              {address.country}
            </address>
          </div>
        </aside>
      </div>

      <Link to="/orders" className={`mt-10 inline-block ${btnSecondary}`}>
        Back to orders
      </Link>
    </PageContainer>
  )
}

export default OrderDetailsPage
