// Savings dashboard: key metrics, 30-day chart, categories, milestones and week comparison (mock data)
import PageContainer from '../components/PageContainer'
import SavingsChart from '../components/SavingsChart'
import { mockSavings } from '../mocks/mockData'
import { formatDp } from '../utils/format'
import { cardClass } from '../utils/styles'

const MILESTONES = [1000, 10000, 50000]

function DashboardPage() {
  const savings = mockSavings
  const total = savings.total_saved_amount

  const metrics = [
    { label: 'Saved money', value: `${formatDp(total)} DP` },
    { label: 'Orders', value: String(savings.transactions_count) },
    { label: 'Average order', value: `${formatDp(savings.average_order)} DP` },
    { label: 'Largest order', value: `${formatDp(savings.largest_order)} DP` },
  ]

  const categoryTotal = savings.by_category.reduce((sum, item) => sum + item.amount, 0)

  const goal = MILESTONES[MILESTONES.length - 1]
  const progress = Math.min(total / goal, 1) * 100

  const lastWeek = savings.last_week_total
  const previousWeek = savings.previous_week_total
  const weekChange =
    previousWeek > 0 ? Math.round(((lastWeek - previousWeek) / previousWeek) * 100) : null
  const isUp = weekChange !== null && weekChange >= 0

  return (
    <PageContainer title="Savings dashboard">
      <p className="-mt-4 mb-8 text-lg">
        You didn't spend <strong>{formatDp(total)} DP</strong> of real money 🎉
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {metrics.map((metric) => (
          <div key={metric.label} className={cardClass}>
            <p className="text-sm text-gray-600">{metric.label}</p>
            <p className="mt-1 text-xl md:text-2xl font-bold break-words">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className={`${cardClass} lg:col-span-2 min-w-0`} aria-labelledby="chart-title">
          <h2 id="chart-title" className="text-xl font-bold mb-4">
            Last 30 days
          </h2>
          <SavingsChart data={savings.daily} />
        </section>

        <section className={cardClass} aria-labelledby="categories-title">
          <h2 id="categories-title" className="text-xl font-bold mb-4">
            By category
          </h2>
          <ul className="flex flex-col gap-4">
            {savings.by_category.map((item) => {
              const percent = categoryTotal > 0 ? Math.round((item.amount / categoryTotal) * 100) : 0
              return (
                <li key={item.name} className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-gray-600 whitespace-nowrap">
                      {formatDp(item.amount)} DP · {percent}%
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

        <section className={`${cardClass} lg:col-span-2`} aria-labelledby="milestones-title">
          <h2 id="milestones-title" className="text-xl font-bold mb-6">
            Milestones
          </h2>

          <div
            className="relative pb-10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={Math.min(total, goal)}
            aria-label="Progress to 50 000 DP"
          >
            <div className="h-3 rounded-full bg-gray-200">
              <div className="h-3 rounded-full bg-green-400" style={{ width: `${progress}%` }} />
            </div>
            {MILESTONES.map((milestone, index) => {
              const isReached = total >= milestone
              const isLast = index === MILESTONES.length - 1
              return (
                <div
                  key={milestone}
                  className={`absolute -top-0.5 flex flex-col gap-1 ${isLast ? 'items-end' : 'items-center'}`}
                  style={{
                    left: `${(milestone / goal) * 100}%`,
                    transform: isLast ? 'translateX(-100%)' : 'translateX(-50%)',
                  }}
                  aria-hidden="true"
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 border-white ${isReached ? 'bg-green-400' : 'bg-gray-400'}`}
                  />
                  <span
                    className={`text-xs whitespace-nowrap ${isReached ? 'font-semibold text-green-700' : 'text-gray-600'}`}
                  >
                    {formatDp(milestone)}
                  </span>
                </div>
              )
            })}
          </div>

          <ul className="flex flex-col gap-2 text-sm">
            {MILESTONES.map((milestone) => {
              const isReached = total >= milestone
              return (
                <li key={milestone} className="flex justify-between gap-4">
                  <span className="font-medium">
                    <span aria-hidden="true">{isReached ? '✓ ' : '○ '}</span>
                    {formatDp(milestone)} DP
                  </span>
                  <span className={isReached ? 'font-medium text-green-700' : 'text-gray-600'}>
                    {isReached ? 'Reached' : `${formatDp(milestone - total)} DP to go`}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>

        <section className={cardClass} aria-labelledby="week-title">
          <h2 id="week-title" className="text-xl font-bold mb-4">
            Compared to last week
          </h2>
          {weekChange === null ? (
            <p className="text-gray-600">No savings in the previous week to compare with.</p>
          ) : (
            <>
              <p
                className={`flex items-center gap-2 text-3xl font-bold ${isUp ? 'text-green-700' : 'text-red-600'}`}
              >
                <span aria-hidden="true">{isUp ? '↑' : '↓'}</span>
                {Math.abs(weekChange)}%
              </p>
              <p className="text-sm text-gray-600">
                {isUp ? 'more' : 'less'} saved than the week before
              </p>
            </>
          )}
          <dl className="mt-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">Last 7 days</dt>
              <dd className="font-medium whitespace-nowrap">{formatDp(lastWeek)} DP</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">Previous 7 days</dt>
              <dd className="font-medium whitespace-nowrap">{formatDp(previousWeek)} DP</dd>
            </div>
          </dl>
        </section>
      </div>
    </PageContainer>
  )
}

export default DashboardPage
