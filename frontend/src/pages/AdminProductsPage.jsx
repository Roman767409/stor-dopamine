// Admin "Products" screen: product table from GET /api/admin/products with search, status filter,
// pagination and add / edit / deactivate / activate through the admin API
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import ConfirmModal from '../components/ConfirmModal'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ProductFormModal from '../components/ProductFormModal'
import { getErrorKey, isForbidden } from '../utils/apiErrors'
import { formatDp } from '../utils/format'
import { localizedTitle, sameTranslations } from '../utils/productTranslations'
import { isLanguageReload, makeRequestKey } from '../utils/requestKey'
import { btnPrimary, btnSmall, errorClass, inputClass, labelClass } from '../utils/styles'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

// `key` is the translation key of the label
const STATUS_OPTIONS = [
  { value: '', key: 'admin.products.filterAll' },
  { value: 'true', key: 'admin.products.active' },
  { value: 'false', key: 'admin.products.inactive' },
]

function ActiveBadge({ isActive }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
      }`}
    >
      {isActive ? t('admin.products.active') : t('admin.products.inactive')}
    </span>
  )
}

// Translation key for a failed save / deactivate / activate request
function actionErrorKey(error, fallbackKey) {
  const key = getErrorKey(error, fallbackKey)
  // A 404 without a known code still means the product is gone
  if (key === fallbackKey && error?.response?.status === 404) return 'errors.PRODUCT_NOT_FOUND'
  return key
}

// New product body: translations are sent only when at least one language is filled
function createBody(values) {
  const body = { ...values }
  if (!body.title_i18n) delete body.title_i18n
  if (!body.description_i18n) delete body.description_i18n
  return body
}

// Only the fields that differ from the loaded product (PATCH is a partial update).
// Translations are sent as a whole object (the backend replaces it); null clears them.
function changedFields(product, values) {
  const changes = {}
  if (values.title !== product.title) changes.title = values.title
  if (values.description !== (product.description ?? '')) changes.description = values.description
  if (!sameTranslations(values.title_i18n, product.title_i18n)) {
    changes.title_i18n = values.title_i18n
  }
  if (!sameTranslations(values.description_i18n, product.description_i18n)) {
    changes.description_i18n = values.description_i18n
  }
  if (Number(values.price) !== Number(product.price)) changes.price = values.price
  if (values.category_id !== product.category?.id) changes.category_id = values.category_id
  if (values.image_url !== (product.image_url ?? null)) changes.image_url = values.image_url
  if (values.is_active !== product.is_active) changes.is_active = values.is_active
  return changes
}

function AdminProductsPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const [search, setSearch] = useState('')
  // Search text that actually went into the request (updated after a pause in typing)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  // Last server answer together with the request key it belongs to (error is a translation key)
  const [result, setResult] = useState({ key: null, items: [], total: 0, error: null })
  const [forbidden, setForbidden] = useState(false)
  const [categories, setCategories] = useState([])
  // Bumped to retry loading categories when the form opens without them
  const [categoriesAttempt, setCategoriesAttempt] = useState(0)

  // null — form closed, 'new' — adding, product object — editing
  const [editing, setEditing] = useState(null)
  // formError and actionError are translation keys
  const [formError, setFormError] = useState(null)
  const [toDeactivate, setToDeactivate] = useState(null)
  // True while a save / deactivate / activate request is in flight (no double clicks)
  const [isBusy, setIsBusy] = useState(false)
  // Synchronous guard: two fast clicks happen before the disabled state renders
  const busyRef = useRef(false)
  const [actionError, setActionError] = useState(null)

  const params = { page, page_size: PAGE_SIZE }
  if (query) params.q = query
  if (status) params.is_active = status
  // The language is part of the key: category names come localized
  const requestKey = makeRequestKey([params, attempt], language)
  const isLoading = result.key !== requestKey
  // After a language switch the table stays on screen until the new names arrive
  const showSkeleton = isLoading && !isLanguageReload(result.key, requestKey)

  // Categories for the form's select (loaded again after a language switch)
  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    api
      .get('/api/categories', { signal: controller.signal })
      .then((response) => {
        if (!cancelled) setCategories(response.data)
      })
      .catch(() => {
        // The form shows "Choose a category" until the list loads
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [categoriesAttempt, language])

  // Send the search after a pause in typing, not on every letter
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    // Abort and ignore the request if filters, page or attempt change while it is in flight
    const controller = new AbortController()
    let cancelled = false
    const [requestParams] = JSON.parse(requestKey)

    api
      .get('/api/admin/products', { params: requestParams, signal: controller.signal })
      .then((response) => {
        if (cancelled) return
        const { items, total } = response.data
        setResult({ key: requestKey, items, total, error: null })
        // After a deactivation the filtered list may get shorter: go to the last existing page
        const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
        if (requestParams.page > lastPage) setPage(lastPage)
      })
      .catch((error) => {
        if (cancelled) return
        if (isForbidden(error)) setForbidden(true)
        setResult({
          key: requestKey,
          items: [],
          total: 0,
          error: getErrorKey(error, 'admin.products.loadError'),
        })
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [requestKey])

  function reload() {
    setAttempt((value) => value + 1)
  }

  function openForm(product) {
    setFormError(null)
    setActionError(null)
    if (categories.length === 0) setCategoriesAttempt((value) => value + 1)
    setEditing(product)
  }

  function closeForm() {
    if (isBusy) return
    setEditing(null)
  }

  // Runs one admin request; on success reloads the list, on 403 shows the no-access message
  async function runAction(request, fallbackKey, onError) {
    if (busyRef.current) return false
    busyRef.current = true
    setIsBusy(true)
    try {
      await request()
      reload()
      return true
    } catch (error) {
      if (isForbidden(error)) setForbidden(true)
      onError(actionErrorKey(error, fallbackKey))
      return false
    } finally {
      busyRef.current = false
      setIsBusy(false)
    }
  }

  async function handleSave(values) {
    setFormError(null)
    let request
    if (editing === 'new') {
      request = () => api.post('/api/admin/products', createBody(values))
    } else {
      const changes = changedFields(editing, values)
      if (Object.keys(changes).length === 0) {
        setEditing(null)
        return
      }
      request = () => api.patch(`/api/admin/products/${editing.id}`, changes)
    }
    const ok = await runAction(request, 'admin.products.saveError', setFormError)
    if (ok) setEditing(null)
  }

  async function handleConfirmDeactivate() {
    const product = toDeactivate
    setActionError(null)
    await runAction(
      () => api.delete(`/api/admin/products/${product.id}`),
      'admin.products.deactivateError',
      setActionError
    )
    setToDeactivate(null)
  }

  function handleActivate(product) {
    setActionError(null)
    runAction(
      () => api.patch(`/api/admin/products/${product.id}`, { is_active: true }),
      'admin.products.activateError',
      setActionError
    )
  }

  function resetFilters() {
    setSearch('')
    setQuery('')
    setStatus('')
    setPage(1)
  }

  if (forbidden) {
    return (
      <>
        <h1 className="text-3xl font-bold mb-8">{t('admin.products.title')}</h1>
        <ErrorState message={t('errors.FORBIDDEN')} />
      </>
    )
  }

  const { items: products, total, error } = result
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">{t('admin.products.title')}</h1>
        <button type="button" onClick={() => openForm('new')} className={btnPrimary}>
          {t('admin.products.add')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-2xl">
        <div className="flex flex-col gap-1">
          <label htmlFor="products-search" className={labelClass}>
            {t('common.search')}
          </label>
          <input
            id="products-search"
            type="search"
            placeholder={t('admin.products.searchPlaceholder')}
            maxLength={100}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="products-status" className={labelClass}>
            {t('common.status')}
          </label>
          <select
            id="products-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.key)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionError && (
        <p role="alert" className={`mb-4 ${errorClass}`}>
          {t(actionError)}
        </p>
      )}

      {showSkeleton && <LoadingSkeleton variant="list" />}

      {!showSkeleton && error && <ErrorState message={t(error)} onRetry={reload} />}

      {!showSkeleton && !error && products.length === 0 && (
        <EmptyState
          title={t('admin.products.emptyTitle')}
          text={query || status ? t('admin.products.emptyFiltered') : t('admin.products.emptyText')}
          actionLabel={query || status ? t('common.resetFilters') : undefined}
          onAction={query || status ? resetFilters : undefined}
        />
      )}

      {!showSkeleton && !error && products.length > 0 && (
        <>
          <table className="w-full text-sm text-left">
            <thead className="border-b border-gray-200 text-xs text-gray-600">
              <tr>
                <th scope="col" className="py-3 pr-4 font-medium">
                  {t('admin.products.columnTitle')}
                </th>
                <th scope="col" className="hidden sm:table-cell py-3 px-2 font-medium">
                  {t('common.category')}
                </th>
                <th scope="col" className="py-3 px-2 font-medium text-right">
                  {t('common.price')}
                </th>
                <th scope="col" className="hidden md:table-cell py-3 px-2 font-medium">
                  {t('common.status')}
                </th>
                <th scope="col" className="py-3 pl-2 font-medium text-right">
                  <span className="sr-only">{t('admin.products.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-gray-200 align-top">
                  <td className="py-4 pr-4">
                    {/* The list shows the title in the UI language; the form edits the base one */}
                    <span
                      className={`font-medium break-words ${product.is_active ? '' : 'text-gray-500'}`}
                    >
                      {localizedTitle(product, language)}
                    </span>
                    {/* On narrow screens category and status move under the title */}
                    <span className="block sm:hidden text-xs text-gray-600">
                      {product.category?.name}
                    </span>
                    <span className="block md:hidden mt-1">
                      <ActiveBadge isActive={product.is_active} />
                    </span>
                  </td>
                  <td className="hidden sm:table-cell py-4 px-2 text-gray-600">
                    {product.category?.name}
                  </td>
                  <td className="py-4 px-2 text-right whitespace-nowrap">
                    {formatDp(product.price)}
                  </td>
                  <td className="hidden md:table-cell py-4 px-2">
                    <ActiveBadge isActive={product.is_active} />
                  </td>
                  <td className="py-3 pl-2">
                    <div className="flex flex-col lg:flex-row justify-end items-end gap-2">
                      <button
                        type="button"
                        onClick={() => openForm(product)}
                        disabled={isBusy}
                        className={btnSmall}
                      >
                        {t('admin.products.edit')}
                      </button>
                      {product.is_active ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActionError(null)
                            setToDeactivate(product)
                          }}
                          disabled={isBusy}
                          className={btnSmall}
                        >
                          {t('admin.products.deactivate')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleActivate(product)}
                          disabled={isBusy}
                          className={btnSmall}
                        >
                          {t('admin.products.activate')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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

      {editing && (
        // key: categories may arrive after the form opened; remount picks the default category
        <ProductFormModal
          key={categories.length}
          product={editing === 'new' ? null : editing}
          categories={categories}
          isSaving={isBusy}
          serverError={formError ? t(formError) : null}
          onSave={handleSave}
          onCancel={closeForm}
        />
      )}

      {toDeactivate && (
        <ConfirmModal
          title={t('admin.products.confirmTitle')}
          text={t('admin.products.confirmText', { title: localizedTitle(toDeactivate, language) })}
          confirmLabel={t('admin.products.deactivate')}
          isBusy={isBusy}
          onConfirm={handleConfirmDeactivate}
          onCancel={() => {
            if (!isBusy) setToDeactivate(null)
          }}
        />
      )}
    </>
  )
}

export default AdminProductsPage
