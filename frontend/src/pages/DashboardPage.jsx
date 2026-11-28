// Savings dashboard: key metrics, 30-day chart, categories, milestones and week comparison
// from GET /api/analytics/savings
import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingSkeleton from '../components/LoadingSkeleton'
import PageContainer from '../components/PageContainer'
import SavingsChart from '../components/SavingsChart'
import { getErrorKey } from '../utils/apiErrors'
import { isLanguageReload, makeRequestKey } from '../utils/requestKey'
import { formatDp, formatNumber, toNumber } from '../utils/format'
import { cardClass } from '../utils/styles'

const MILESTONES = [1000, 10000, 50000]
const DAYS = 30

function DashboardPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(0)
  // Last server answer together with the request key it belongs to (error is a translation key)
  const [result, setResult] = useState({ key: null, savings: null, error: null })

  // The language is part of the key: category names come localized
  const requestKey = makeRequestKey([DAYS, attempt], i18n.language)
  // After a language switch the dashboard stays on screen until the new names arrive
  const isLoading = result.key !== requestKey && !isLanguageReload(result.key, requestKey)

  useEffect(() => {
    // Ignore and abort the request if a retry starts or the page is left
    const controller = new AbortController()
    let cancelled = false
    const [days] = JSON.parse(requestKey)

    api
      .get('/api/analytics/savings', { params: { days }, signal: controller.signal })
      .then((response) => {
        if (cancelled) return
        setResult({ key: requestKey, savings: response.data, error: null })
      })
      .catch((error) => {
        if (cancelled) return
        setResult({
          key: requestKey,
          savings: null,
          error: getErrorKey(error, 'dashboard.loadError'),
        })
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [requestKey])

  if (isLoading) {
    return (
      <PageContainer title={t('dashboard.title')}>
        <LoadingSkeleton variant="list" count={4} />
      </PageContainer>
    )
  }

  if (result.error) {
    return (
      <PageContainer title={t('dashboard.title')}>
        <ErrorState message={t(result.error)} onRetry={() => setAttempt((count) => count + 1)} />
      </PageContainer>
    )
  }

  const savings = result.savings

  // No orders yet: nothing to chart, show a friendly hint instead of empty widgets
  if (toNumber(savings.orders_count) === 0) {
    return (
      <PageContainer title={t('dashboard.title')}>
        <EmptyState
          title={t('dashboard.emptyTitle')}
          text={t('dashboard.emptyText')}
          actionLabel={t('common.goToShop')}
          onAction={() => navigate('/shop')}
        />
      </PageContainer>
    )
  }

  const total = toNumber(savings.total_saved)
  const daily = (savings.by_day ?? []).map((day) => ({
    date: day.date,
    amount: toNumber(day.amount),
  }))
  const categories = (savings.by_category ?? []).map((item) => ({
    slug: item.slug,
    name: item.category,
    amount: toNumber(item.amount),
  }))

  const metrics = [
    { key: 'dashboard.savedMoney', value: formatDp(total) },
    { key: 'dashboard.orders', value: formatNumber(savings.orders_count) },
    { key: 'dashboard.averageOrder', value: formatDp(savings.average_order_value) },
    { key: 'dashboard.largestOrder', value: formatDp(savings.largest_order) },
  ]

  const categoryTotal = categories.reduce((sum, item) => sum + item.amount, 0)

  const goal = MILESTONES[MILESTONES.length - 1]
  const progress = Math.min(total / goal, 1) * 100

  const lastWeek = toNumber(savings.last_week_total)
  const previousWeek = toNumber(savings.previous_week_total)
  // No percentage when the previous week is 0 (division by zero)
  const weekChange =
    previousWeek > 0 ? Math.round(((lastWeek - previousWeek) / previousWeek) * 100) : null
  const isUp = weekChange !== null && weekChange >= 0

  return (
    <PageContainer title={t('dashboard.title')}>
      <p className="-mt-4 mb-8 text-lg">
        <Trans
          i18nKey="dashboard.notSpent"
          values={{ amount: formatDp(total) }}
          components={{ strong: <strong /> }}
        />
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {metrics.map((metric) => (
          <div key={metric.key} className={cardClass}>
            <p className="text-sm text-gray-600">{t(metric.key)}</p>
            <p className="mt-1 text-xl md:text-2xl font-bold break-words">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className={`${cardClass} lg:col-span-2 min-w-0`} aria-labelledby="chart-title">
          <h2 id="chart-title" className="text-xl font-bold mb-4">
            {t('common.lastDays', { count: DAYS })}
          </h2>
          <SavingsChart data={daily} />
        </section>

        <section className={cardClass} aria-labelledby="categories-title">
          <h2 id="categories-title" className="text-xl font-bold mb-4">
            {t('dashboard.byCategory')}
          </h2>
          <ul className="flex flex-col gap-4">
            {categories.map((item) => {
              const percent = categoryTotal > 0 ? Math.round((item.amount / categoryTotal) * 100) : 0
              return (
                <li key={item.slug} className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="font-medium min-w-0 break-words">{item.name}</span>
                    <span className="text-gray-600 whitespace-nowrap">
                      {formatDp(item.amount)} · {percent}%
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
            {t('dashboard.milestones')}
          </h2>

          <div
            className="relative pb-10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={Math.min(total, goal)}
            aria-label={t('dashboard.progressTo', { amount: formatDp(goal) })}
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
                    {formatNumber(milestone)}
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
                    {formatDp(milestone)}
                  </span>
                  <span className={isReached ? 'font-medium text-green-700' : 'text-gray-600'}>
                    {isReached
                      ? t('dashboard.reached')
                      : t('dashboard.toGo', { amount: formatDp(milestone - total) })}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>

        <section className={cardClass} aria-labelledby="week-title">
          <h2 id="week-title" className="text-xl font-bold mb-4">
            {t('dashboard.comparedTitle')}
          </h2>
          {weekChange === null ? (
            <p className="text-gray-600">{t('dashboard.noPreviousWeek')}</p>
          ) : (
            <>
              <p
                className={`flex items-center gap-2 text-3xl font-bold ${isUp ? 'text-green-700' : 'text-red-600'}`}
              >
                <span aria-hidden="true">{isUp ? '↑' : '↓'}</span>
                {Math.abs(weekChange)}%
              </p>
              <p className="text-sm text-gray-600">
                {isUp ? t('dashboard.moreThanPrevious') : t('dashboard.lessThanPrevious')}
              </p>
            </>
          )}
          <dl className="mt-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">{t('dashboard.last7Days')}</dt>
              <dd className="font-medium whitespace-nowrap">{formatDp(lastWeek)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">{t('dashboard.previous7Days')}</dt>
              <dd className="font-medium whitespace-nowrap">{formatDp(previousWeek)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </PageContainer>
  )
}

export default DashboardPage
