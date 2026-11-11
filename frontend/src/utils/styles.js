// Shared Tailwind class sets, copied from the existing pages so new screens look the same

// Visible keyboard focus for buttons and links
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900'

// Dark main button (AuthPage submit)
export const btnPrimary = `bg-gray-900 hover:bg-gray-700 text-white rounded-full px-6 py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-900 ${focusRing}`

// Light gray rounded button (Home, Cart), same height as the dark one
export const btnSecondary = `bg-gray-200 hover:bg-gray-300 rounded-full px-6 py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200 ${focusRing}`

// Small light gray button (Cart "Remove")
export const btnSmall = `bg-gray-200 hover:bg-gray-300 rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200 ${focusRing}`

// Underlined form field, label and error text (AuthPage)
export const inputClass =
  'w-full bg-transparent border-0 border-b border-gray-400 py-2 text-sm outline-none focus:border-gray-900'
export const labelClass = 'text-xs text-gray-700'
export const errorClass = 'text-sm text-red-600'

// Bordered content card (same border color as the header and cart rows)
export const cardClass = 'border border-gray-200 rounded-xl p-4 md:p-6'
