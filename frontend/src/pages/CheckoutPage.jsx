// Checkout screen: shipping form, test card form (client-side only) and order summary; places the order via POST /api/orders
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import FormField from '../components/FormField'
import PageContainer from '../components/PageContainer'
import { getErrorKey } from '../utils/apiErrors'
import { formatDp } from '../utils/format'
import { btnPrimary, cardClass } from '../utils/styles'

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

// Translation keys of the "field is empty" errors
const REQUIRED_MESSAGES = {
  fullName: 'checkout.errors.fullNameRequired',
  address: 'checkout.errors.addressRequired',
  city: 'checkout.errors.cityRequired',
  postalCode: 'checkout.errors.postalCodeRequired',
  country: 'checkout.errors.countryRequired',
  cardNumber: 'checkout.errors.cardNumberRequired',
  expiry: 'checkout.errors.expiryRequired',
  cvc: 'checkout.errors.cvcRequired',
}

const TEST_CARD = '4242 4242 4242 4242'

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

// Returns { field: translationKey } for every invalid field
function validate(form, now) {
  const errors = {}

  for (const [field, message] of Object.entries(REQUIRED_MESSAGES)) {
    if (form[field].trim() === '') errors[field] = message
  }

  if (!errors.cardNumber) {
    const digits = form.cardNumber.replace(/\D/g, '')
    if (digits.length !== 16) {
      errors.cardNumber = 'checkout.errors.cardNumberLength'
    } else if (!passesLuhn(digits)) {
      errors.cardNumber = 'checkout.errors.cardNumberInvalid'
    }
  }

  if (!errors.expiry) {
    const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(form.expiry)
    if (!match) {
      errors.expiry = 'checkout.errors.expiryFormat'
    } else {
      const month = Number(match[1])
      const year = 2000 + Number(match[2])
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      // The card works until the end of its expiry month
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        errors.expiry = 'checkout.errors.cardExpired'
      }
    }
  }

  if (!errors.cvc && !/^\d{3}$/.test(form.cvc)) {
    errors.cvc = 'checkout.errors.cvcFormat'
  }

  return errors
}

// Stable fingerprint of the cart contents (product ids + quantities only)
function cartSignature(items) {
  return JSON.stringify(
    items.map((item) => [item.id, item.quantity]).sort((a, b) => (a[0] < b[0] ? -1 : 1))
  )
}

function CheckoutPage() {
  const { t } = useTranslation()
  const { user, updateBalance } = useAuth()
  const { items, totalPrice, clearCart } = useCart()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [wasSubmitted, setWasSubmitted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  // Translation key of the failed order request ('' when there is none)
  const [submitError, setSubmitError] = useState('')
  // Idempotency key is reused for retries of the same cart and replaced when the cart changes
  const idempotencyKeyRef = useRef(null)
  const keySignatureRef = useRef(null)
  // Synchronous guard against double submit (state updates are async)
  const inFlightRef = useRef(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
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

  // Returns the key for the current cart: same cart -> same key, changed cart -> new key
  function getIdempotencyKey() {
    const signature = cartSignature(items)
    if (!idempotencyKeyRef.current || keySignatureRef.current !== signature) {
      idempotencyKeyRef.current = crypto.randomUUID()
      keySignatureRef.current = signature
    }
    return idempotencyKeyRef.current
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canPay || inFlightRef.current) return

    setWasSubmitted(true)
    const nextErrors = validate(form, new Date())
    setErrors(nextErrors)
    const firstError = Object.keys(nextErrors)[0]
    if (firstError) {
      document.getElementById(`checkout-${firstError}`)?.focus()
      return
    }

    const shippingAddress = {
      full_name: form.fullName.trim(),
      line1: form.address.trim(),
      city: form.city.trim(),
      postal_code: form.postalCode.trim(),
      country: form.country.trim(),
    }
    // Only ids and quantities: the server computes prices itself. Card data is never sent.
    const payload = {
      items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      shipping_address: shippingAddress,
    }
    const idempotencyKey = getIdempotencyKey()

    inFlightRef.current = true
    setIsProcessing(true)
    setSubmitError('')
    try {
      const { data } = await api.post('/api/orders', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })

      // Order shape stays compatible with OrderSuccessPage and TrackingPage
      const order = {
        id: data.order_id,
        tracking_number: data.tracking_number,
        total_price: data.total_price,
        status: data.status,
        created_at: data.created_at,
        shipping_address: shippingAddress,
        items: items.map((item) => ({
          title: item.title,
          quantity: item.quantity,
          price_at_purchase: item.price,
        })),
      }

      // Next order gets a fresh key
      idempotencyKeyRef.current = null
      keySignatureRef.current = null
      updateBalance(data.new_balance)
      clearCart()
      if (isMountedRef.current) {
        navigate('/order-success', { state: { order, newBalance: data.new_balance } })
      }
    } catch (error) {
      // Cart is kept; the same key will be reused if the cart stays the same
      if (isMountedRef.current) {
        setSubmitError(getErrorKey(error))
        setIsProcessing(false)
      }
    } finally {
      inFlightRef.current = false
    }
  }

  function fieldProps(name) {
    return {
      id: `checkout-${name}`,
      value: form[name],
      error: errors[name] ? t(errors[name]) : undefined,
      disabled: isProcessing,
      onChange: (event) => updateField(name, event.target.value),
    }
  }

  return (
    <PageContainer title={t('checkout.title')}>
      <div
        role="note"
        className="mb-8 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-900"
      >
        {t('checkout.simulationNote')}
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 flex flex-col gap-10">
          <section>
            <h2 className="text-xl font-bold mb-6">{t('checkout.shippingAddress')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                label={t('checkout.fullName')}
                autoComplete="name"
                className="sm:col-span-2"
                {...fieldProps('fullName')}
              />
              <FormField
                label={t('checkout.address')}
                autoComplete="street-address"
                className="sm:col-span-2"
                {...fieldProps('address')}
              />
              <FormField label={t('checkout.city')} autoComplete="address-level2" {...fieldProps('city')} />
              <FormField
                label={t('checkout.postalCode')}
                autoComplete="postal-code"
                {...fieldProps('postalCode')}
              />
              <FormField
                label={t('checkout.country')}
                autoComplete="country-name"
                className="sm:col-span-2"
                {...fieldProps('country')}
              />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">{t('checkout.testCard')}</h2>
            <p className="text-xs text-gray-700 mb-6">
              {t('checkout.testCardHint', { card: TEST_CARD })}
            </p>
            <div className="grid grid-cols-2 gap-6">
              <FormField
                label={t('checkout.cardNumber')}
                inputMode="numeric"
                autoComplete="off"
                placeholder={TEST_CARD}
                className="col-span-2"
                {...fieldProps('cardNumber')}
                onChange={(event) => updateField('cardNumber', formatCardNumber(event.target.value))}
              />
              <FormField
                label={t('checkout.expiry')}
                inputMode="numeric"
                autoComplete="off"
                placeholder={t('checkout.expiryPlaceholder')}
                {...fieldProps('expiry')}
                onChange={(event) => updateField('expiry', formatExpiry(event.target.value))}
              />
              <FormField
                label={t('checkout.cvc')}
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
          <h2 className="text-xl font-bold">{t('checkout.orderSummary')}</h2>

          {isEmpty ? (
            <p className="text-sm text-gray-600">{t('cart.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span className="min-w-0 break-words">
                    {item.title} × {item.quantity}
                  </span>
                  <span className="whitespace-nowrap">
                    {formatDp(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <hr className="border-gray-200 my-1" />

          <div className="flex justify-between gap-4">
            <span className="text-gray-600">{t('common.total')}</span>
            <span className="font-bold whitespace-nowrap">{formatDp(totalPrice)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">{t('common.yourBalance')}</span>
            <span className="font-medium whitespace-nowrap">{formatDp(balance)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">{t('checkout.balanceAfter')}</span>
            <span
              className={`font-medium whitespace-nowrap ${notEnoughDp ? 'text-red-600' : ''}`}
            >
              {formatDp(balance - totalPrice)}
            </span>
          </div>

          {notEnoughDp && <p className="text-red-600 font-medium">{t('common.notEnoughDp')}</p>}

          {submitError && (
            <p role="alert" className="text-red-600 font-medium">
              {t(submitError)}
            </p>
          )}

          <button
            type="submit"
            disabled={!canPay}
            aria-busy={isProcessing}
            className={`mt-2 w-full ${btnPrimary}`}
          >
            {isProcessing ? t('checkout.processing') : t('checkout.pay', { amount: formatDp(totalPrice) })}
          </button>
        </aside>
      </form>
    </PageContainer>
  )
}

export default CheckoutPage
