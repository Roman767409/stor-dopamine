// "My orders" screen: list of orders with status badges (mock data; ?empty=1 shows the empty state)
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import PageContainer from '../components/PageContainer'
import StatusBadge from '../components/StatusBadge'
import { mockOrders } from '../mocks/mockData'
import { formatDate, formatDp } from '../utils/format'
import { btnSmall, cardClass } from '../utils/styles'

function OrdersPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const orders =
    searchParams.get('empty') === '1'
      ? []
      : [...mockOrders].sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <PageContainer title="My orders">
      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          text="Your orders will appear here after checkout."
          actionLabel="Go to shop"
          onAction={() => navigate('/shop')}
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className={`${cardClass} flex flex-col md:flex-row md:items-center gap-4 md:gap-6`}
            >
              <dl className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:items-center">
                <div>
                  <dt className="text-xs text-gray-600">Date</dt>
                  <dd className="font-medium">{formatDate(order.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-600">Tracking number</dt>
                  <dd className="font-medium break-all">{order.tracking_number}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-600">Total</dt>
                  <dd className="font-bold whitespace-nowrap">{formatDp(order.total_price)} DP</dd>
                </div>
                <div>
                  <dt className="sr-only">Status</dt>
                  <dd>
                    <StatusBadge status={order.status} />
                  </dd>
                </div>
              </dl>
              <div className="flex gap-2 shrink-0">
                <Link to={`/orders/${order.id}`} className={`flex-1 text-center ${btnSmall}`}>
                  Details
                </Link>
                <Link
                  to={`/tracking/${order.tracking_number}`}
                  className={`flex-1 text-center ${btnSmall}`}
                >
                  Track
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}

export default OrdersPage
