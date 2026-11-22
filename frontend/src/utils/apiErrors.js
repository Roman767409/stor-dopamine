// Helpers for the backend error format { "error": { "code", "message" } }

export const FORBIDDEN_MESSAGE = '403, no access. This page is only available to administrators.'

// { code, message } from the response body, or null (network error, aborted request)
export function getApiError(error) {
  return error?.response?.data?.error ?? null
}

export function getErrorMessage(error, fallback) {
  return getApiError(error)?.message || fallback
}

// The admin role was lost after the page was opened
export function isForbidden(error) {
  return error?.response?.status === 403
}
