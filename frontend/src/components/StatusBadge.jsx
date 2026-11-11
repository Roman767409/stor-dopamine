// Colored pill with the order status label (different color for each of the 4 statuses)
import { getStatusLabel } from '../utils/orderStatus'

const STATUS_COLORS = {
  CREATED: 'bg-gray-200 text-gray-800',
  PROCESSING: 'bg-yellow-100 text-yellow-800',
  IN_TRANSIT: 'bg-blue-100 text-blue-800',
  DELIVERED: 'bg-green-100 text-green-800',
}

function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] ?? 'bg-gray-200 text-gray-800'
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${colors}`}
    >
      {getStatusLabel(status)}
    </span>
  )
}

export default StatusBadge
