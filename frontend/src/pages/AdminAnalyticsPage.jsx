// Admin "Analytics" screen: store totals, orders per day, orders by status, top products
// and top categories from GET /api/admin/analytics
import { useEffect, useState } from 'react'
import api from '../api'
import ErrorState from '../components/ErrorState'
import LoadingSkeleton from '../components/LoadingSkeleton'
import SavingsChart from '../components/SavingsChart'
import StatusBadge from '../components/StatusBadge'
import { FORBIDDEN_MESSAGE, getErrorMessage, isForbidden } from '../utils/apiErrors'
import { formatDp, toNumber } from '../utils/format'
import { ORDER_STEPS } from '../utils/orderStatus'
import { cardClass } from '../utils/styles'

const DAYS = 30

// Share of part in total as a whole percent; 0 when the total is 0
function percentOf(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

function AdminAnalyticsPage() {
  const [attempt, setAttempt] = useState(0)
  // Last server answer together with the request key it belongs to
  const [result, setResult] = useState({ key: null, stats: null, error: null, forbidden: false })

  const requestKey = JSON.stringify([DAYS, attempt])
  const isLoading = result.key !== requestKey

  useEffect(() => {
    // Abort and ignore the request if a retry starts or the page is left
    const controller = new AbortController()
    let cancelled = false
    const [days] = JSON.parse(requestKey)

    api
      .get('/api/admin/analytics', { params: { days }, signal: controller.signal })
      .then((response) => {
        if (cancelled) return
        setResult({ key: requestKey, stats: response.data, error: null, forbidden: false })
      })
      .catch((error) => {
        if (cancelled) return
        setResult({
          key: requestKey,
          stats: null,
          error: getErrorMessage(error, 'Could not load analytics'),
          forbidden: isForbidden(error),
        })
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [requestKey])

  const title = <h1 className="text-3xl font-bold mb-8">Analytics</h1>

  if (isLoading) {
    return (
      <>
        {title}
        <LoadingSkeleton variant="list" count={4} />
      </>
    )
  }

  if (result.forbidden) {
    return (
      <>
        {title}
        <ErrorState message={FORBIDDEN_MESSAGE} />
      </>
    )
  }

  if (result.error) {
    return (
      <>
        {title}
        <ErrorState message={result.error} onRetry={() => setAttempt((count) => count + 1)} />
      </>
    )
  }

  const stats = result.stats
  const cards = [
    { label: 'Users', value: formatDp(toNumber(stats.users_count)) },
    {
      label: 'Orders',
      value: formatDp(toNumber(stats.orders_count)),
      note: `${formatDp(toNumber(stats.orders_in_period))} in the last ${DAYS} days`,
    },
    {
      label: 'Total volume',
      value: `${formatDp(toNumber(stats.total_spent))} DP`,
      note: `${formatDp(toNumber(stats.spent_in_period))} DP in the last ${DAYS} days`,
    },
    {
      label: 'New users',
      value: formatDp(toNumber(stats.new_users)),
      note: `in the last ${DAYS} days`,
    },
    { label: 'Average order', value: `${formatDp(toNumber(stats.average_order_value))} DP` },
    { label: 'Active products', value: formatDp(toNumber(stats.active_products_count)) },
  ]

  const ordersByStatus = stats.orders_by_status ?? {}
  const statusCounts = ORDER_STEPS.map((step) => toNumber(ordersByStatus[step.status]))
  const statusTotal = statusCounts.reduce((sum, count) => sum + count, 0)

  const daily = (stats.by_day ?? []).map((day) => ({
    date: day.date,
    amount: toNumber(day.amount),
  }))
  const topProducts = stats.top_products ?? []
  const categories = (stats.top_categories ?? []).map((item) => ({
    slug: item.slug,
    name: item.category,
    revenue: toNumber(item.revenue),
    itemsCount: toNumber(item.items_count),
  }))
  const categoryTotal = categories.reduce((sum, item) => sum + item.revenue, 0)

  return (
    <>
      {title}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        {cards.map((card) => (
          <div key={card.label} className={cardClass}>
            <p className="text-sm text-gray-600">{card.label}</p>
            <p className="mt-1 text-2xl font-bold break-words">{card.value}</p>
            {card.note && <p className="text-xs text-gray-600">{card.note}</p>}
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className={`${cardClass} lg:col-span-2 min-w-0`} aria-labelledby="chart-title">
          <h2 id="chart-title" className="text-xl font-bold mb-4">
            Last {DAYS} days
          </h2>
          <SavingsChart data={daily} />
        </section>

        <section className={cardClass} aria-labelledby="categories-title">
          <h2 id="categories-title" className="text-xl font-bold mb-4">
            Top categories
          </h2>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-600">No sales yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {categories.map((item) => {
                const percent = percentOf(item.revenue, categoryTotal)
                return (
                  <li key={item.slug} className="flex flex-col gap-1 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-gray-600 whitespace-nowrap">
                        {formatDp(item.revenue)} DP · {percent}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200" aria-hidden="true">
                      <div
                        className="h-2 rounded-full bg-green-400"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{item.itemsCount} sold</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className={cardClass} aria-labelledby="status-title">
          <h2 id="status-title" className="text-xl font-bold mb-4">
            Orders by status
          </h2>
          <ul className="flex flex-col gap-4">
            {ORDER_STEPS.map((step, index) => {
              const count = statusCounts[index]
              const percent = percentOf(count, statusTotal)
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
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-600">No sales yet.</p>
          ) : (
            <ol className="flex flex-col">
              {topProducts.map((product, index) => (
                <li
                  key={product.product_id}
                  className="flex items-center gap-4 py-3 border-b border-gray-200 last:border-b-0 text-sm"
                >
                  <span className="w-6 shrink-0 font-bold text-gray-600">{index + 1}</span>
                  <span className="flex-1 min-w-0 font-medium break-words">{product.title}</span>
                  <span className="text-right whitespace-nowrap">
                    <span className="block font-semibold">
                      {formatDp(toNumber(product.revenue))} DP
                    </span>
                    <span className="block text-xs text-gray-600">
                      {toNumber(product.quantity)} sold
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  )
}

export default AdminAnalyticsPage
