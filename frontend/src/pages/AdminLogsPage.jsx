// Admin "Logs" screen: audit log from GET /api/admin/logs with filters, pagination
// and an expandable details payload
import { Fragment, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { getErrorKey, isForbidden } from '../utils/apiErrors'
import { summarizeLog } from '../utils/auditSummary'
import { formatDp, formatLocalDateTime } from '../utils/format'
import { btnSmall, errorClass, inputClass, labelClass } from '../utils/styles'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300
const REQUEST_ID_PREVIEW_LENGTH = 8
const ENTITY_ID_PREVIEW_LENGTH = 8

const EMPTY_FILTERS = { action: '', dateFrom: '', dateTo: '' }

function shortRequestId(requestId) {
  if (!requestId) return '—'
  return requestId.length > REQUEST_ID_PREVIEW_LENGTH
    ? `${requestId.slice(0, REQUEST_ID_PREVIEW_LENGTH)}…`
    : requestId
}

// First characters of the entity id; the full value goes into the title tooltip
function shortEntityId(entityId) {
  return String(entityId).slice(0, ENTITY_ID_PREVIEW_LENGTH)
}

function AdminLogsPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [actor, setActor] = useState('')
  // Actor text that actually went into the request (updated after a pause in typing)
  const [actorQuery, setActorQuery] = useState('')
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  // Last server answer together with the request key it belongs to
  // (error and filterError are translation keys)
  const [result, setResult] = useState({
    key: null,
    items: [],
    total: 0,
    error: null,
    filterError: null,
  })
  const [forbidden, setForbidden] = useState(false)
  const [actions, setActions] = useState([])
  const [expandedId, setExpandedId] = useState(null)

  const params = { page, page_size: PAGE_SIZE }
  if (filters.action) params.action = filters.action
  if (actorQuery) params.actor = actorQuery
  if (filters.dateFrom) params.date_from = filters.dateFrom
  if (filters.dateTo) params.date_to = filters.dateTo
  const requestKey = JSON.stringify([params, attempt])
  const isLoading = result.key !== requestKey
  const hasFilters = Boolean(filters.action || actorQuery || filters.dateFrom || filters.dateTo)

  // Action names for the filter; the select keeps only "All actions" if this fails
  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    api
      .get('/api/admin/logs/actions', { signal: controller.signal })
      .then((response) => {
        if (!cancelled) setActions(response.data.actions ?? [])
      })
      .catch((error) => {
        if (!cancelled && isForbidden(error)) setForbidden(true)
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  // Send the actor search after a pause in typing, not on every letter
  useEffect(() => {
    const timer = setTimeout(() => {
      setActorQuery(actor.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [actor])

  useEffect(() => {
    // Abort and ignore the request if filters, page or attempt change while it is in flight
    const controller = new AbortController()
    let cancelled = false
    const [requestParams] = JSON.parse(requestKey)

    api
      .get('/api/admin/logs', { params: requestParams, signal: controller.signal })
      .then((response) => {
        if (cancelled) return
        const { items, total } = response.data
        setResult({ key: requestKey, items, total, error: null, filterError: null })
        const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
        if (requestParams.page > lastPage) setPage(lastPage)
      })
      .catch((error) => {
        if (cancelled) return
        if (isForbidden(error)) setForbidden(true)
        // Invalid filter values (e.g. INVALID_DATE_RANGE) are shown next to the filters
        const isFilterError = error.response?.status === 422
        const errorKey = getErrorKey(error, 'admin.logs.loadError')
        setResult({
          key: requestKey,
          items: [],
          total: 0,
          error: isFilterError ? null : errorKey,
          filterError: isFilterError ? errorKey : null,
        })
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [requestKey])

  function updateFilter(name, value) {
    setFilters((prev) => ({ ...prev, [name]: value }))
    setPage(1)
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS)
    setActor('')
    setActorQuery('')
    setPage(1)
  }

  if (forbidden) {
    return (
      <>
        <h1 className="text-3xl font-bold mb-8">{t('admin.logs.title')}</h1>
        <ErrorState message={t('errors.FORBIDDEN')} />
      </>
    )
  }

  const { items: logs, total, error, filterError } = result
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <h1 className="text-3xl font-bold mb-8">{t('admin.logs.title')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-2xl">
        <div className="flex flex-col gap-1">
          <label htmlFor="logs-action" className={labelClass}>
            {t('admin.logs.actionType')}
          </label>
          <select
            id="logs-action"
            value={filters.action}
            onChange={(event) => updateFilter('action', event.target.value)}
            className={inputClass}
          >
            <option value="">{t('admin.logs.allActions')}</option>
            {actions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="logs-search" className={labelClass}>
            {t('admin.logs.userEmail')}
          </label>
          <input
            id="logs-search"
            type="search"
            placeholder="name@example.com"
            maxLength={254}
            value={actor}
            onChange={(event) => setActor(event.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="logs-date-from" className={labelClass}>
            {t('admin.logs.from')}
          </label>
          <input
            id="logs-date-from"
            type="date"
            value={filters.dateFrom}
            aria-invalid={filterError ? 'true' : undefined}
            onChange={(event) => updateFilter('dateFrom', event.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="logs-date-to" className={labelClass}>
            {t('admin.logs.to')}
          </label>
          <input
            id="logs-date-to"
            type="date"
            value={filters.dateTo}
            aria-invalid={filterError ? 'true' : undefined}
            onChange={(event) => updateFilter('dateTo', event.target.value)}
            className={inputClass}
          />
        </div>
        {!isLoading && filterError && (
          <p role="alert" className={`sm:col-span-2 ${errorClass}`}>
            {t(filterError)}
          </p>
        )}
      </div>

      {isLoading && <LoadingSkeleton variant="list" />}

      {!isLoading && error && (
        <ErrorState message={t(error)} onRetry={() => setAttempt((value) => value + 1)} />
      )}

      {!isLoading && !error && logs.length === 0 && (
        <EmptyState
          title={t('admin.logs.emptyTitle')}
          text={hasFilters ? t('admin.logs.emptyText') : undefined}
          actionLabel={hasFilters ? t('common.resetFilters') : undefined}
          onAction={hasFilters ? resetFilters : undefined}
        />
      )}

      {!isLoading && !error && logs.length > 0 && (
        <>
          <table className="w-full text-sm text-left">
            <thead className="border-b border-gray-200 text-xs text-gray-600">
              <tr>
                <th scope="col" className="hidden sm:table-cell py-3 pr-4 font-medium">
                  {t('admin.logs.time')}
                </th>
                <th scope="col" className="py-3 pr-4 sm:px-2 font-medium">
                  {t('admin.logs.user')}
                </th>
                <th scope="col" className="py-3 px-2 font-medium">
                  {t('admin.logs.action')}
                </th>
                <th scope="col" className="hidden lg:table-cell py-3 px-2 font-medium">
                  {t('admin.logs.requestId')}
                </th>
                <th scope="col" className="py-3 pl-2 font-medium text-right">
                  <span className="sr-only">{t('admin.logs.details')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const isExpanded = expandedId === log.id
                const detailsId = `details-${log.id}`
                const hasDetails = log.details !== null && log.details !== undefined
                const fullDetails = hasDetails ? JSON.stringify(log.details, null, 2) : ''
                return (
                  <Fragment key={log.id}>
                    <tr className={`align-top ${isExpanded ? '' : 'border-b border-gray-200'}`}>
                      <td className="hidden sm:table-cell py-4 pr-4 whitespace-nowrap text-gray-600">
                        {formatLocalDateTime(log.created_at)}
                      </td>
                      <td className="py-4 pr-4 sm:px-2">
                        <span className="break-all">{log.actor_email || '—'}</span>
                        <span className="block sm:hidden text-xs text-gray-600">
                          {formatLocalDateTime(log.created_at)}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        <span className="inline-block rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium break-all">
                          {log.action}
                        </span>
                        {log.entity_id && (
                          <span className="ml-2 text-xs text-gray-600" title={String(log.entity_id)}>
                            {shortEntityId(log.entity_id)}
                          </span>
                        )}
                        <span className="block mt-1 text-xs text-gray-600 break-words">
                          {summarizeLog(log, t, formatDp)}
                        </span>
                      </td>
                      <td
                        className="hidden lg:table-cell py-4 px-2 text-gray-600 whitespace-nowrap"
                        title={log.request_id || undefined}
                      >
                        {shortRequestId(log.request_id)}
                      </td>
                      <td className="py-3 pl-2 text-right">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={detailsId}
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          className={btnSmall}
                        >
                          {isExpanded ? t('admin.logs.hide') : t('admin.logs.show')}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-gray-200">
                        <td colSpan={5} className="pb-4">
                          <p className="text-xs text-gray-600 mb-2 lg:hidden break-all">
                            {t('admin.logs.requestIdValue', { id: log.request_id || '—' })}
                          </p>
                          <pre
                            id={detailsId}
                            className="bg-gray-100 rounded-xl p-4 text-xs whitespace-pre-wrap break-all"
                          >
                            {hasDetails ? fullDetails : t('admin.logs.noDetails')}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <nav aria-label={t('common.pagination')} className="mt-10 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className={btnSmall}
              >
                {t('common.previous')}
              </button>
              <span className="text-sm font-medium">
                {t('common.pageOf', { page, total: totalPages })}
              </span>
              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className={btnSmall}
              >
                {t('common.next')}
              </button>
            </nav>
          )}
        </>
      )}
    </>
  )
}

export default AdminLogsPage
