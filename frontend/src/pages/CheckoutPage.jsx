// Checkout screen: shipping form, test card form and order summary (payment is simulated)
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import FormField from '../components/FormField'
import PageContainer from '../components/PageContainer'
import { formatDp } from '../utils/format'
import { btnPrimary, cardClass } from '../utils/styles'

const PROCESSING_MS = 1500
const TRACKING_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

const EMPTY_FORM = {
  fullName: '',
  address: '',
  city: '',
  postalCode: '',
  country: '',
  cardNumber: '',
  expiry: '',
  cvc: '',
}

const REQUIRED_MESSAGES = {
  fullName: 'Enter your full name',
  address: 'Enter your address',
  city: 'Enter your city',
  postalCode: 'Enter your postal code',
  country: 'Enter your country',
  cardNumber: 'Enter the card number',
  expiry: 'Enter the expiry date',
  cvc: 'Enter the CVC',
}

// "4242424242424242" -> "4242 4242 4242 4242"
function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

// "1228" -> "12/28"
function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

// Luhn checksum, the same check real card numbers pass
function passesLuhn(digits) {
  let total = 0
  for (let i = 0; i < digits.length; i += 1) {
    let digit = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    total += digit
  }
  return total % 10 === 0
}

function validate(form, now) {
  const errors = {}

  for (const [field, message] of Object.entries(REQUIRED_MESSAGES)) {
    if (form[field].trim() === '') errors[field] = message
  }

  if (!errors.cardNumber) {
    const digits = form.cardNumber.replace(/\D/g, '')
    if (digits.length !== 16) {
      errors.cardNumber = 'Card number must have 16 digits'
    } else if (!passesLuhn(digits)) {
      errors.cardNumber = 'Invalid card number'
    }
  }

  if (!errors.expiry) {
    const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(form.expiry)
    if (!match) {
      errors.expiry = 'Use the MM/YY format'
    } else {
      const month = Number(match[1])
      const year = 2000 + Number(match[2])
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      // The card works until the end of its expiry month
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        errors.expiry = 'The card has expired'
      }
    }
  }

  if (!errors.cvc && !/^\d{3}$/.test(form.cvc)) {
    errors.cvc = 'CVC must be 3 digits'
  }

  return errors
}

function generateTrackingNumber() {
  let code = ''
  for (let i = 0; i < 10; i += 1) {
    code += TRACKING_CHARS[Math.floor(Math.random() * TRACKING_CHARS.length)]
  }
  return `DS-${code}`
}

function CheckoutPage() {
  const { user } = useAuth()
  const { items, totalPrice, clearCart } = useCart()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [wasSubmitted, setWasSubmitted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const timerRef = useRef(null)

  // Stop the fake payment if the user leaves the page
  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  const balance = Number(user?.virtual_balance ?? 0)
  const isEmpty = items.length === 0
  const notEnoughDp = totalPrice > balance
  const canPay = !isEmpty && !notEnoughDp && !isProcessing

  function updateField(name, value) {
    const next = { ...form, [name]: value }
    setForm(next)
    // After the first attempt, errors update while the user types
    if (wasSubmitted) setErrors(validate(next, new Date()))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!canPay) return

    setWasSubmitted(true)
    const nextErrors = validate(form, new Date())
    setErrors(nextErrors)
    const firstError = Object.keys(nextErrors)[0]
    if (firstError) {
      document.getElementById(`checkout-${firstError}`)?.focus()
      return
    }

    const order = {
      id: 'new',
      tracking_number: generateTrackingNumber(),
      total_price: totalPrice,
      status: 'CREATED',
      created_at: new Date().toISOString(),
      shipping_address: {
        full_name: form.fullName.trim(),
        line1: form.address.trim(),
        city: form.city.trim(),
        postal_code: form.postalCode.trim(),
        country: form.country.trim(),
      },
      items: items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        price_at_purchase: item.price,
      })),
    }
    const newBalance = balance - totalPrice

    setIsProcessing(true)
    timerRef.current = setTimeout(() => {
      clearCart()
      navigate('/order-success', { state: { order, newBalance } })
    }, PROCESSING_MS)
  }

  function fieldProps(name) {
    return {
      id: `checkout-${name}`,
      value: form[name],
      error: errors[name],
      disabled: isProcessing,
      onChange: (event) => updateField(name, event.target.value),
    }
  }

  return (
    <PageContainer title="Checkout">
      <div
        role="note"
        className="mb-8 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-900"
      >
        ⚠ This is a simulation. Use test card numbers only.
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 flex flex-col gap-10">
          <section>
            <h2 className="text-xl font-bold mb-6">Shipping address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                label="Full name"
                autoComplete="name"
                className="sm:col-span-2"
                {...fieldProps('fullName')}
              />
              <FormField
                label="Address"
                autoComplete="street-address"
                className="sm:col-span-2"
                {...fieldProps('address')}
              />
              <FormField label="City" autoComplete="address-level2" {...fieldProps('city')} />
              <FormField
                label="Postal code"
                autoComplete="postal-code"
                {...fieldProps('postalCode')}
              />
              <FormField
                label="Country"
                autoComplete="country-name"
                className="sm:col-span-2"
                {...fieldProps('country')}
              />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">Test card</h2>
            <p className="text-xs text-gray-700 mb-6">
              Example: 4242 4242 4242 4242, any future date, any 3 digits.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <FormField
                label="Card number"
                inputMode="numeric"
                autoComplete="off"
                placeholder="4242 4242 4242 4242"
                className="col-span-2"
                {...fieldProps('cardNumber')}
                onChange={(event) => updateField('cardNumber', formatCardNumber(event.target.value))}
              />
              <FormField
                label="Expiry (MM/YY)"
                inputMode="numeric"
                autoComplete="off"
                placeholder="MM/YY"
                {...fieldProps('expiry')}
                onChange={(event) => updateField('expiry', formatExpiry(event.target.value))}
              />
              <FormField
                label="CVC"
                inputMode="numeric"
                autoComplete="off"
                placeholder="123"
                {...fieldProps('cvc')}
                onChange={(event) =>
                  updateField('cvc', event.target.value.replace(/\D/g, '').slice(0, 3))
                }
              />
            </div>
          </section>
        </div>

        <aside className={`${cardClass} flex flex-col gap-3 self-start lg:sticky lg:top-6`}>
          <h2 className="text-xl font-bold">Order summary</h2>

          {isEmpty ? (
            <p className="text-sm text-gray-600">Your cart is empty</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span className="min-w-0 break-words">
                    {item.title} × {item.quantity}
                  </span>
                  <span className="whitespace-nowrap">
                    {formatDp(item.price * item.quantity)} DP
                  </span>
                </li>
              ))}
            </ul>
          )}

          <hr className="border-gray-200 my-1" />

          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Total</span>
            <span className="font-bold whitespace-nowrap">{formatDp(totalPrice)} DP</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Your balance</span>
            <span className="font-medium whitespace-nowrap">{formatDp(balance)} DP</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Balance after payment</span>
            <span
              className={`font-medium whitespace-nowrap ${notEnoughDp ? 'text-red-600' : ''}`}
            >
              {formatDp(balance - totalPrice)} DP
            </span>
          </div>

          {notEnoughDp && <p className="text-red-600 font-medium">Not enough DP</p>}

          <button
            type="submit"
            disabled={!canPay}
            aria-busy={isProcessing}
            className={`mt-2 w-full ${btnPrimary}`}
          >
            {isProcessing ? 'Processing…' : `Pay ${formatDp(totalPrice)} DP`}
          </button>
        </aside>
      </form>
    </PageContainer>
  )
}

export default CheckoutPage
