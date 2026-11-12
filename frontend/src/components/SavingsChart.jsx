// Inline SVG bar chart of daily savings (no chart libraries); redraws to the container width
import { useEffect, useRef, useState } from 'react'
import { formatDp } from '../utils/format'

const HEIGHT = 240
const PADDING = { top: 12, right: 8, bottom: 32, left: 64 }
const LABEL_EVERY_DAYS = 7

// "2026-11-11" -> "11 Nov"
function formatDay(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

function SavingsChart({ data }) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const maxAmount = Math.max(0, ...data.map((day) => day.amount))
  const yMax = Math.max(1000, Math.ceil(maxAmount / 1000) * 1000)
  const plotWidth = Math.max(0, width - PADDING.left - PADDING.right)
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
  const slot = data.length > 0 ? plotWidth / data.length : 0
  const barWidth = Math.max(2, slot * 0.6)
  const baseline = PADDING.top + plotHeight
  const yTicks = [0, yMax / 2, yMax]

  return (
    <div ref={containerRef} className="w-full">
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Saved DP per day for the last ${data.length} days`}
          className="block"
        >
          {/* Y axis: grid lines and values */}
          {yTicks.map((tick) => {
            const y = baseline - (tick / yMax) * plotHeight
            return (
              <g key={tick}>
                <line
                  x1={PADDING.left}
                  x2={width - PADDING.right}
                  y1={y}
                  y2={y}
                  className={tick === 0 ? 'stroke-gray-400' : 'stroke-gray-200'}
                />
                <text
                  x={PADDING.left - 8}
                  y={y}
                  dy="0.35em"
                  textAnchor="end"
                  className="fill-gray-600 text-xs"
                >
                  {formatDp(tick)}
                </text>
              </g>
            )
          })}
          <text
            x={12}
            y={PADDING.top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 12 ${PADDING.top + plotHeight / 2})`}
            className="fill-gray-600 text-xs"
          >
            DP
          </text>

          {/* Bars; the transparent column makes the tooltip work on empty days too */}
          {data.map((day, index) => {
            const x = PADDING.left + index * slot
            const barHeight = (day.amount / yMax) * plotHeight
            return (
              <g key={day.date}>
                <title>{`${formatDay(day.date)}: ${formatDp(day.amount)} DP`}</title>
                <rect x={x} y={PADDING.top} width={slot} height={plotHeight} fill="transparent" />
                {day.amount > 0 && (
                  <rect
                    x={x + (slot - barWidth) / 2}
                    y={baseline - barHeight}
                    width={barWidth}
                    height={barHeight}
                    rx={2}
                    className="fill-green-400"
                  />
                )}
              </g>
            )
          })}

          {/* X axis: one date label per week */}
          {data.map((day, index) =>
            index % LABEL_EVERY_DAYS === 0 ? (
              <text
                key={day.date}
                x={PADDING.left + index * slot + slot / 2}
                y={HEIGHT - 10}
                textAnchor="middle"
                className="fill-gray-600 text-xs"
              >
                {formatDay(day.date)}
              </text>
            ) : null
          )}
        </svg>
      )}
    </div>
  )
}

export default SavingsChart
