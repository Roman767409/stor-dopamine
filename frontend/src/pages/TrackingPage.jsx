// Parcel tracking: search by tracking number and a vertical status timeline
// from GET /api/orders/track/{tracking_number}, refreshed every 5 s until delivered
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import ErrorState from '../components/ErrorState'
import LoadingSkeleton from '../components/LoadingSkeleton'
import PageContainer from '../components/PageContainer'
import StatusBadge from '../components/StatusBadge'
import { formatLocalDate } from '../utils/format'
import { getStatusLabel } from '../utils/orderStatus'
import { btnPrimary, cardClass, errorClass, inputClass, labelClass } from '../utils/styles'

const TRACKING_PATTERN = /^DS-[A-Z0-9]{10}$/
const FORMAT_ERROR = 'Wrong format. Example: DS-1A2B3C4D5E'
const NOT_FOUND_ERROR = 'Parcel not found'
const POLL_INTERVAL_MS = 5000

// 404 TRACKING_NOT_FOUND (missing or someone else's parcel) or 422 (rejected format)
function isNotFound(error) {
  const status = error.response?.status
  return (
    (status === 404 && error.response?.data?.error?.code === 'TRACKING_NOT_FOUND') ||
    status === 422
  )
}

function TrackingPage() {
  const params = useParams()
  const navigate = useNavigate()
  const trackingNumber = params.trackingNumber?.toUpperCase() ?? ''
  const [value, setValue] = useState(trackingNumber)
  const [formError, setFormError] = useState('')
  const [attempt, setAttempt] = useState(0)
  // Last server answer together with the request key it belongs to
  const [result, setResult] = useState({ key: null, parcel: null, notFound: false, error: null })

  // No request for an empty or malformed number
  const isValidNumber = TRACKING_PATTERN.test(trackingNumber)
  const requestKey = isValidNumber ? JSON.stringify([trackingNumber, attempt]) : null
  // Answers for another number (or an older attempt) are never shown
  const current = requestKey !== null && result.key === requestKey ? result : null
  // Skeleton only until the first answer; background refreshes keep the old data on screen
  const isLoading = requestKey !== null && current === null

  useEffect(() => {
    if (requestKey === null) return
    const [number] = JSON.parse(requestKey)
    const controller = new AbortController()
    let stopped = false
    let timer = null

    // One request at a time: the next poll is scheduled only after this one finishes
    function poll(isFirst) {
      api
        .get(`/api/orders/track/${encodeURIComponent(number)}`, { signal: controller.signal })
        .then((response) => {
          if (stopped) return
          setResult({ key: requestKey, parcel: response.data, notFound: false, error: null })
          // Delivered is the final status: stop polling
          if (response.data.status !== 'DELIVERED') {
            timer = setTimeout(() => poll(false), POLL_INTERVAL_MS)
          }
        })
        .catch((error) => {
          if (stopped) return
          const notFound = isNotFound(error)
          if (isFirst || notFound) {
            setResult({
              key: requestKey,
              parcel: null,
              notFound,
              error: notFound
                ? null
                : error.response?.data?.error?.message || 'Could not load tracking info',
            })
            return
          }
          // Failed background refresh: keep the last data and try again on the next tick
          timer = setTimeout(() => poll(false), POLL_INTERVAL_MS)
        })
    }

    poll(true)

    // Number changed, retry pressed or page left: stop the timer and drop the request
    return () => {
      stopped = true
      clearTimeout(timer)
      controller.abort()
    }
  }, [requestKey])

  function handleSubmit(event) {
    event.preventDefault()
    const normalized = value.trim().toUpperCase()
    if (!TRACKING_PATTERN.test(normalized)) {
      setFormError(FORMAT_ERROR)
      return
    }
    setFormError('')
    setValue(normalized)
    navigate(`/tracking/${normalized}`)
  }

  let lookupError = ''
  if (trackingNumber && !isValidNumber) lookupError = FORMAT_ERROR
  else if (current?.notFound) lookupError = NOT_FOUND_ERROR
  const error = formError || lookupError

  const parcel = current?.parcel ?? null

  return (
    <PageContainer title="Track parcel">
      <form onSubmit={handleSubmit} noValidate className="max-w-xl flex flex-col gap-1">
        <label htmlFor="tracking-number" className={labelClass}>
          Tracking number
        </label>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <input
            id="tracking-number"
            type="text"
            placeholder="DS-1A2B3C4D5E"
            autoComplete="off"
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              setFormError('')
            }}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'tracking-error' : undefined}
            className={`${inputClass} uppercase placeholder:normal-case`}
          />
          <button type="submit" className={`shrink-0 ${btnPrimary}`}>
            Track
          </button>
        </div>
        {error && (
          <p id="tracking-error" role="alert" className={`mt-2 ${errorClass}`}>
            {error}
          </p>
        )}
      </form>

      {isLoading && !formError && (
        <div className="mt-10 max-w-xl">
          <LoadingSkeleton variant="list" count={2} />
        </div>
      )}

      {current?.error && !formError && (
        <div className="max-w-xl">
          <ErrorState message={current.error} onRetry={() => setAttempt((count) => count + 1)} />
        </div>
      )}

      {parcel && !formError && (
        <section className={`mt-10 max-w-xl ${cardClass}`} aria-labelledby="parcel-title">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 id="parcel-title" className="text-xl font-bold break-all">
              {parcel.tracking_number}
            </h2>
            {/* Polite live region: screen readers hear the status when polling changes it */}
            <span aria-live="polite">
              <StatusBadge status={parcel.status} />
            </span>
          </div>

          <ol className="flex flex-col">
            {parcel.timeline.map((step, index) => {
              // Current = the reported status; done = reached earlier steps; the rest are inactive
              const isCurrent = step.status === parcel.status
              const isDone = step.is_reached && !isCurrent
              const isLast = index === parcel.timeline.length - 1

              let dotClass = 'bg-white border-2 border-gray-300'
              if (isCurrent) dotClass = 'bg-green-400 text-white ring-4 ring-green-100'
              else if (isDone) dotClass = 'bg-gray-900 text-white'

              let labelColor = 'text-gray-500'
              if (isCurrent) labelColor = 'text-green-700'
              else if (isDone) labelColor = 'text-gray-900'

              return (
                <li key={step.status} className={`relative flex gap-4 ${isLast ? '' : 'pb-8'}`}>
                  {!isLast && (
                    <span
                      className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${isDone ? 'bg-gray-900' : 'bg-gray-200'}`}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative z-10 w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${dotClass}`}
                    aria-hidden="true"
                  >
                    {(isDone || isCurrent) && '✓'}
                  </span>
                  <div className="flex flex-col">
                    <span className={`font-semibold ${labelColor}`}>
                      {getStatusLabel(step.status)}
                      {isCurrent && <span className="sr-only"> (current status)</span>}
                    </span>
                    <span className="text-sm text-gray-600">
                      {step.is_reached
                        ? formatLocalDate(step.reached_at)
                        : `Expected ${formatLocalDate(step.reached_at)}`}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>

          <p className="mt-6 pt-4 border-t border-gray-200 text-sm">
            <span className="text-gray-600">
              {parcel.status === 'DELIVERED' ? 'Delivered: ' : 'Estimated delivery: '}
            </span>
            <span className="font-semibold">{formatLocalDate(parcel.estimated_delivery_at)}</span>
          </p>
        </section>
      )}
    </PageContainer>
  )
}

export default TrackingPage
