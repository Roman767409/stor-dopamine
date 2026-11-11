// Order statuses in delivery order, with labels and mock day offsets for the timeline

export const ORDER_STEPS = [
  { status: 'CREATED', label: 'Created', dayOffset: 0 },
  { status: 'PROCESSING', label: 'Processing', dayOffset: 1 },
  { status: 'IN_TRANSIT', label: 'In transit', dayOffset: 2 },
  { status: 'DELIVERED', label: 'Delivered', dayOffset: 5 },
]

// "IN_TRANSIT" -> "In transit"
export function getStatusLabel(status) {
  return ORDER_STEPS.find((step) => step.status === status)?.label ?? status
}
