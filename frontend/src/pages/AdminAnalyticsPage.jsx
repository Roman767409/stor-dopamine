// Admin "Analytics" screen: totals, orders by status and top products (mock data)
import StatusBadge from '../components/StatusBadge'
import { mockAdminStats } from '../mocks/mockData'
import { formatDp } from '../utils/format'
import { ORDER_STEPS } from '../utils/orderStatus'
import { cardClass } from '../utils/styles'

function AdminAnalyticsPage() {
  const stats = mockAdminStats
  const cards = [
    { label: 'Users', value: formatDp(stats.users_count) },
    { label: 'Orders', value: formatDp(stats.orders_count) },
    { label: 'Total volume', value: `${formatDp(stats.total_volume)} DP` },
  ]
  const statusTotal = Object.values(stats.orders_by_status).reduce((sum, count) => sum + count, 0)

  return (
    <>
      <h1 className="text-3xl font-bold mb-8">Analytics</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        {cards.map((card) => (
          <div key={card.label} className={cardClass}>
            <p className="text-sm text-gray-600">{card.label}</p>
            <p className="mt-1 text-2xl font-bold break-words">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className={cardClass} aria-labelledby="status-title">
          <h2 id="status-title" className="text-xl font-bold mb-4">
            Orders by status
          </h2>
          <ul className="flex flex-col gap-4">
            {ORDER_STEPS.map((step) => {
              const count = stats.orders_by_status[step.status] ?? 0
              const percent = statusTotal > 0 ? Math.round((count / statusTotal) * 100) : 0
              return (
                <li key={step.status} className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <StatusBadge status={step.status} />
                    <span className="text-gray-600 whitespace-nowrap">
                      {count} · {percent}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200" aria-hidden="true">
                    <div
                      className="h-2 rounded-full bg-green-400"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section className={cardClass} aria-labelledby="top-title">
          <h2 id="top-title" className="text-xl font-bold mb-4">
            Top products
          </h2>
          <ol className="flex flex-col">
            {stats.top_products.map((product, index) => (
              <li
                key={product.title}
                className="flex items-center gap-4 py-3 border-b border-gray-200 last:border-b-0 text-sm"
              >
                <span className="w-6 shrink-0 font-bold text-gray-600">{index + 1}</span>
                <span className="flex-1 min-w-0 font-medium break-words">{product.title}</span>
                <span className="text-right whitespace-nowrap">
                  <span className="block font-semibold">{formatDp(product.revenue)} DP</span>
                  <span className="block text-xs text-gray-600">{product.sold} sold</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  )
}

export default AdminAnalyticsPage
