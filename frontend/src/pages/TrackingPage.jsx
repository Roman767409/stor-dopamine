// Parcel tracking: search by tracking number and a vertical status timeline (mock data)
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import StatusBadge from '../components/StatusBadge'
import { mockOrders } from '../mocks/mockData'
import { addDays, formatDate } from '../utils/format'
import { ORDER_STEPS } from '../utils/orderStatus'
import { btnPrimary, cardClass, errorClass, inputClass, labelClass } from '../utils/styles'

const TRACKING_PATTERN = /^DS-[A-Z0-9]{10}$/
const FORMAT_ERROR = 'Wrong format. Example: DS-1A2B3C4D5E'
const NOT_FOUND_ERROR = 'Parcel not found'

// Finds the parcel for the number from the URL; a fresh order can come from the success page
function findParcel(trackingNumber, stateOrder) {
  if (!trackingNumber) return { order: null, error: '' }
  if (!TRACKING_PATTERN.test(trackingNumber)) return { order: null, error: FORMAT_ERROR }
  const order =
    mockOrders.find((item) => item.tracking_number === trackingNumber) ??
    (stateOrder?.tracking_number === trackingNumber ? stateOrder : null)
  return order ? { order, error: '' } : { order: null, error: NOT_FOUND_ERROR }
}

function TrackingPage() {
  const params = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const trackingNumber = params.trackingNumber?.toUpperCase()
  const [value, setValue] = useState(trackingNumber ?? '')
  const [formError, setFormError] = useState('')

  const { order, error: lookupError } = findParcel(trackingNumber, location.state?.order)
  const error = formError || lookupError

  function handleSubmit(event) {
    event.preventDefault()
    const normalized = value.trim().toUpperCase()
    if (!TRACKING_PATTERN.test(normalized)) {
      setFormError(FORMAT_ERROR)
      return
    }
    setFormError('')
    setValue(normalized)
    navigate(`/tracking/${normalized}`, { state: location.state })
  }

  const currentIndex = order ? ORDER_STEPS.findIndex((step) => step.status === order.status) : -1
  const lastStep = ORDER_STEPS[ORDER_STEPS.length - 1]
  const deliveryDate = order ? addDays(order.created_at, lastStep.dayOffset) : null

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

      {order && !formError && (
        <section className={`mt-10 max-w-xl ${cardClass}`} aria-labelledby="parcel-title">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 id="parcel-title" className="text-xl font-bold break-all">
              {order.tracking_number}
            </h2>
            <StatusBadge status={order.status} />
          </div>

          <ol className="flex flex-col">
            {ORDER_STEPS.map((step, index) => {
              const isDone = index < currentIndex
              const isCurrent = index === currentIndex
              const date = addDays(order.created_at, step.dayOffset)
              const isLast = index === ORDER_STEPS.length - 1

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
                      {step.label}
                      {isCurrent && <span className="sr-only"> (current status)</span>}
                    </span>
                    <span className="text-sm text-gray-600">
                      {index <= currentIndex ? formatDate(date) : `Expected ${formatDate(date)}`}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>

          <p className="mt-6 pt-4 border-t border-gray-200 text-sm">
            <span className="text-gray-600">
              {order.status === 'DELIVERED' ? 'Delivered: ' : 'Estimated delivery: '}
            </span>
            <span className="font-semibold">{formatDate(deliveryDate)}</span>
          </p>
        </section>
      )}
    </PageContainer>
  )
}

export default TrackingPage
