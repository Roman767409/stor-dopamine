// Short human-readable summary of an audit log entry for the admin "Logs" table.
// The raw details stay available as formatted JSON behind the "Show" button.
import { formatNumber } from './format'

const SEPARATOR = ' · '

// Translation keys of product fields that PRODUCT_UPDATED can list as changed
const FIELD_KEYS = {
  title: 'admin.logs.summary.fields.title',
  description: 'admin.logs.summary.fields.description',
  title_i18n: 'admin.logs.summary.fields.title_i18n',
  description_i18n: 'admin.logs.summary.fields.description_i18n',
  price: 'admin.logs.summary.fields.price',
  category_id: 'admin.logs.summary.fields.category_id',
  image_url: 'admin.logs.summary.fields.image_url',
  is_active: 'admin.logs.summary.fields.is_active',
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// Number or numeric string -> number; anything else -> null
function amount(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

// Non-empty trimmed string or null
function text(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

// "old → new DP"; only the new value carries the currency suffix
function amountChange(oldValue, newValue, formatDp) {
  return `${formatNumber(oldValue)} → ${formatDp(newValue)}`
}

// Unknown (future) fields: "image_url" -> "image url"
function fieldName(field, t) {
  return FIELD_KEYS[field] ? t(FIELD_KEYS[field]) : field.replaceAll('_', ' ')
}

function orderCreated(details, t, formatDp) {
  const tracking = text(details.tracking_number)
  const parts = [
    tracking
      ? t('admin.logs.summary.order', { tracking })
      : t('admin.logs.summary.orderNoTracking'),
  ]
  const count = amount(details.items_count)
  if (count !== null) parts.push(t('admin.logs.summary.itemsCount', { count }))
  const total = amount(details.total_price)
  if (total !== null) parts.push(formatDp(total))
  return parts.join(SEPARATOR)
}

function productCreated(details, t, formatDp) {
  const title = text(details.title)
  const parts = [
    title
      ? t('admin.logs.summary.productCreated', { title })
      : t('admin.logs.summary.productCreatedNoTitle'),
  ]
  const price = amount(details.price)
  if (price !== null) parts.push(formatDp(price))
  return parts.join(SEPARATOR)
}

function productUpdated(details, t, formatDp) {
  const changes = isObject(details.changes) ? details.changes : {}
  // The title is only in the details when it was changed: show the new one
  const title = isObject(changes.title) ? text(changes.title.new) : null
  const parts = [
    title
      ? t('admin.logs.summary.productUpdated', { title })
      : t('admin.logs.summary.productUpdatedNoTitle'),
  ]
  const fields = Object.keys(changes).map((field) => {
    const change = changes[field]
    if (field === 'price' && isObject(change)) {
      const oldPrice = amount(change.old)
      const newPrice = amount(change.new)
      if (oldPrice !== null && newPrice !== null) {
        return `${fieldName(field, t)} ${amountChange(oldPrice, newPrice, formatDp)}`
      }
    }
    return fieldName(field, t)
  })
  if (fields.length > 0) {
    parts.push(t('admin.logs.summary.changed', { fields: fields.join(', ') }))
  }
  return parts.join(SEPARATOR)
}

function productDeleted(details, t) {
  const title = text(details.title)
  return title
    ? t('admin.logs.summary.productDeactivated', { title })
    : t('admin.logs.summary.productDeactivatedNoTitle')
}

function balanceReset(details, t, formatDp) {
  const oldBalance = amount(details.old_balance)
  const newBalance = amount(details.new_balance)
  if (oldBalance === null || newBalance === null) return t('admin.logs.summary.balanceResetNoAmounts')
  return t('admin.logs.summary.balanceReset', {
    change: amountChange(oldBalance, newBalance, formatDp),
  })
}

const SUMMARIES = {
  ORDER_CREATED: orderCreated,
  PRODUCT_CREATED: productCreated,
  PRODUCT_UPDATED: productUpdated,
  PRODUCT_DELETED: productDeleted,
  BALANCE_RESET: balanceReset,
}

// entry: a log item from GET /api/admin/logs; t: i18next t(); formatDp: utils/format formatDp.
// Always returns a string in the UI language; missing or malformed details never throw.
export function summarizeLog(entry, t, formatDp) {
  const details = isObject(entry?.details) ? entry.details : null
  const summarize = SUMMARIES[entry?.action]
  if (summarize) return summarize(details ?? {}, t, formatDp)
  // Any other (e.g. future) action: no raw JSON in the row
  return entry?.details != null
    ? t('admin.logs.summary.detailsAvailable')
    : t('admin.logs.noDetails')
}
