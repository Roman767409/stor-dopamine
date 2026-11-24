// Helpers for the backend error format { "error": { "code", "message" } }.
// The server's English `message` is never shown: the `code` is mapped to a translation key.
import axios from 'axios'

// Codes that have their own text under "errors.<CODE>" in the locale files
const KNOWN_CODES = new Set([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'VALIDATION_ERROR',
  'EMAIL_ALREADY_EXISTS',
  'INVALID_CREDENTIALS',
  'INSUFFICIENT_FUNDS',
  'PRODUCT_UNAVAILABLE',
  'PRODUCT_NOT_FOUND',
  'CATEGORY_NOT_FOUND',
  'ORDER_NOT_FOUND',
  'TRACKING_NOT_FOUND',
  'NOTHING_TO_RESET',
  'INVALID_DATE_RANGE',
  'INVALID_PRICE_RANGE',
])

// { code, message } from the response body, or null (network error, aborted request)
export function getApiError(error) {
  return error?.response?.data?.error ?? null
}

// Translation key for a failed request:
// known code -> "errors.<CODE>", no response at all -> "errors.network",
// anything else -> `fallbackKey` (a screen may pass a more specific text, default "errors.generic").
// Store the key and translate it while rendering, so a language switch updates the message.
export function getErrorKey(error, fallbackKey = 'errors.generic') {
  const code = getApiError(error)?.code
  if (code && KNOWN_CODES.has(code)) return `errors.${code}`
  if (!error?.response && !axios.isCancel(error)) return 'errors.network'
  return fallbackKey
}

// The admin role was lost after the page was opened
export function isForbidden(error) {
  return error?.response?.status === 403
}
