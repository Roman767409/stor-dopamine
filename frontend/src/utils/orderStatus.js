// Order statuses in delivery order, with mock day offsets for the timeline.
// Labels come from the locale files ("status.<STATUS>").
import i18n from '../i18n'

export const ORDER_STEPS = [
  { status: 'CREATED', dayOffset: 0 },
  { status: 'PROCESSING', dayOffset: 1 },
  { status: 'IN_TRANSIT', dayOffset: 2 },
  { status: 'DELIVERED', dayOffset: 5 },
]

// "IN_TRANSIT" -> "In transit"; an unknown status is shown as is.
// Pass the component's `t` so the label follows language changes.
export function getStatusLabel(status, t = (key, options) => i18n.t(key, options)) {
  return t(`status.${status}`, { defaultValue: status })
}
