// Admin "Logs" screen: audit log table with action filter, email search and expandable payload (mock)
import { Fragment, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { mockLogs } from '../mocks/mockData'
import { formatDateTime } from '../utils/format'
import { btnSmall, inputClass, labelClass } from '../utils/styles'

const ACTION_TYPES = [
  'USER_REGISTERED',
  'USER_LOGIN',
  'ORDER_CREATED',
  'PRODUCT_CREATED',
  'PRODUCT_UPDATED',
  'PRODUCT_DEACTIVATED',
  'BALANCE_RESET',
]

function logKey(log) {
  return `${log.timestamp}-${log.user_email}-${log.action_type}`
}

function AdminLogsPage() {
  const [actionType, setActionType] = useState('')
  const [search, setSearch] = useState('')
  const [expandedKey, setExpandedKey] = useState(null)

  const query = search.trim().toLowerCase()
  const logs = mockLogs.filter(
    (log) =>
      (!actionType || log.action_type === actionType) &&
      (!query || log.user_email.toLowerCase().includes(query))
  )

  function resetFilters() {
    setActionType('')
    setSearch('')
  }

  return (
    <>
      <h1 className="text-3xl font-bold mb-8">Logs</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-2xl">
        <div className="flex flex-col gap-1">
          <label htmlFor="logs-action" className={labelClass}>
            Action type
          </label>
          <select
            id="logs-action"
            value={actionType}
            onChange={(event) => setActionType(event.target.value)}
            className={inputClass}
          >
            <option value="">All actions</option>
            {ACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="logs-search" className={labelClass}>
            User email
          </label>
          <input
            id="logs-search"
            type="search"
            placeholder="name@example.com"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          title="No logs found"
          text="Try another action type or email."
          actionLabel="Reset filters"
          onAction={resetFilters}
        />
      ) : (
        <table className="w-full text-sm text-left">
          <thead className="border-b border-gray-200 text-xs text-gray-600">
            <tr>
              <th scope="col" className="hidden sm:table-cell py-3 pr-4 font-medium">
                Time
              </th>
              <th scope="col" className="py-3 pr-4 sm:px-2 font-medium">
                User
              </th>
              <th scope="col" className="py-3 px-2 font-medium">
                Action
              </th>
              <th scope="col" className="hidden lg:table-cell py-3 px-2 font-medium">
                IP address
              </th>
              <th scope="col" className="py-3 pl-2 font-medium text-right">
                <span className="sr-only">Payload</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const key = logKey(log)
              const isExpanded = expandedKey === key
              const payloadId = `payload-${key}`
              return (
                <Fragment key={key}>
                  <tr className={`align-top ${isExpanded ? '' : 'border-b border-gray-200'}`}>
                    <td className="hidden sm:table-cell py-4 pr-4 whitespace-nowrap text-gray-600">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-4 pr-4 sm:px-2">
                      <span className="break-all">{log.user_email}</span>
                      <span className="block sm:hidden text-xs text-gray-600">
                        {formatDateTime(log.timestamp)}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <span className="inline-block rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium break-all">
                        {log.action_type}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell py-4 px-2 text-gray-600">
                      {log.ip_address}
                    </td>
                    <td className="py-3 pl-2 text-right">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={payloadId}
                        onClick={() => setExpandedKey(isExpanded ? null : key)}
                        className={btnSmall}
                      >
                        {isExpanded ? 'Hide' : 'Show'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-gray-200">
                      <td colSpan={5} className="pb-4">
                        <p className="text-xs text-gray-600 mb-2 lg:hidden">IP: {log.ip_address}</p>
                        <pre
                          id={payloadId}
                          className="bg-gray-100 rounded-xl p-4 text-xs whitespace-pre-wrap break-all"
                        >
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      )}
    </>
  )
}

export default AdminLogsPage
