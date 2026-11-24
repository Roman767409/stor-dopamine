// Number and date formatting shared by the screens.
// The locale follows the current UI language; components re-render on a language change
// because they use useTranslation(), so formatted values update without a page reload.
import i18n from '../i18n'

const LOCALES = { en: 'en-GB', pl: 'pl-PL', uk: 'uk-UA' }

// Intl locale of the current UI language
export function getLocale() {
  return LOCALES[i18n.resolvedLanguage] ?? LOCALES.en
}

// Any missing or non-numeric value becomes 0, so the page never shows NaN
export function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

// Thousands separator of the locale; cents only when they are not zero:
// 95500 -> "95,500" (en) / "95 500" (pl, uk); 99.5 -> "99.50" (en) / "99,50" (pl, uk)
export function formatNumber(amount) {
  const number = toNumber(amount)
  const hasCents = Math.round(Math.abs(number) * 100) % 100 !== 0
  return new Intl.NumberFormat(getLocale(), {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(number)
}

// Amount with the currency suffix; a no-break space keeps "DP" next to the number
export function formatDp(amount) {
  return `${formatNumber(amount)}\u00a0DP`
}

// "2026-11-11T09:24:00Z" -> "11 Nov 2026" (en) / "11 lis 2026" (pl) / "11 лист. 2026 р." (uk)
export function formatLocalDate(value) {
  return new Date(value).toLocaleDateString(getLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Date and time: "11 Nov 2026, 11:24" (en) / "11 lis 2026, 11:24" (pl)
export function formatLocalDateTime(value) {
  return new Date(value).toLocaleString(getLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Calendar day without a year, for chart axes: "2026-11-11" -> "11 Nov"
export function formatDayMonth(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(getLocale(), {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

// Returns a new Date that is `days` days after `value`
export function addDays(value, days) {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}
