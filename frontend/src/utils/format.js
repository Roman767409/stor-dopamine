// Number and date formatting shared by the screens

// 95500 -> "95 500"; shows cents only when they are not zero: 99.5 -> "99.50"
export function formatDp(amount) {
  const number = Number(amount) || 0
  const [whole, fraction] = Math.abs(number).toFixed(2).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const sign = number < 0 ? '-' : ''
  return fraction === '00' ? `${sign}${grouped}` : `${sign}${grouped}.${fraction}`
}

// "2026-11-11T09:24:00Z" -> "11 Nov 2026"
export function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// "2026-11-11T09:24:00Z" -> "11 Nov, 11:24"
export function formatDateTime(value) {
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Returns a new Date that is `days` days after `value`
export function addDays(value, days) {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}
