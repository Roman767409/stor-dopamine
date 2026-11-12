// Order details: items table, shipping address, tracking number, status and total (mock data)
import { Link, useNavigate, useParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import PageContainer from '../components/PageContainer'
import StatusBadge from '../components/StatusBadge'
import { mockOrders } from '../mocks/mockData'
import { formatDate, formatDp } from '../utils/format'
import { btnSecondary, cardClass, focusRing } from '../utils/styles'

function OrderDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const order = mockOrders.find((item) => item.id === id)

  if (!order) {
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
                <tr key={item.title} className="border-b border-gray-200">
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
                    {formatDp(item.price_at_purchase * item.quantity)} DP
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
            <p className="font-medium">{formatDate(order.created_at)}</p>
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
