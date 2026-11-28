import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingSkeleton from '../components/LoadingSkeleton'
import PageContainer from '../components/PageContainer'
import ProductCard from '../components/ProductCard'
import ServerWakingBanner from '../components/ServerWakingBanner'
import { getErrorKey } from '../utils/apiErrors'
import { isLanguageReload, makeRequestKey } from '../utils/requestKey'
import { btnSmall, inputClass, labelClass } from '../utils/styles'

const PAGE_SIZE = 12
// Після цього часу очікування показуємо банер «сервер прокидається»
const SLOW_REQUEST_MS = 3000
// Затримка перед відправкою пошукового запиту
const SEARCH_DEBOUNCE_MS = 400

// `key` is the translation key of the label
const SORT_OPTIONS = [
  { value: 'title_asc', key: 'shop.sortNameAsc' },
  { value: 'price_asc', key: 'shop.sortPriceAsc' },
  { value: 'price_desc', key: 'shop.sortPriceDesc' },
]

const EMPTY_FILTERS = { search: '', category: '', minPrice: '', maxPrice: '', sort: 'title_asc' }

// Збирає параметри запиту, пропускаючи порожні значення
function buildParams(filters, q, page) {
  const params = { page, page_size: PAGE_SIZE, sort: filters.sort }
  if (q) params.q = q
  if (filters.category) params.category = filters.category
  if (filters.minPrice !== '') params.min_price = filters.minPrice
  if (filters.maxPrice !== '') params.max_price = filters.maxPrice
  return params
}

function ShopPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  // Пошуковий рядок, який реально пішов у запит (оновлюється із затримкою)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  // Остання відповідь сервера разом із ключем запиту, якому вона належить (error — ключ перекладу)
  const [result, setResult] = useState({ key: null, items: [], total: 0, error: null })
  const [slowKey, setSlowKey] = useState(null)
  // Categories for the filter; stays empty (only "All") if the request fails
  const [categories, setCategories] = useState([])

  const params = buildParams(filters, query, page)
  const requestKey = makeRequestKey([params, attempt], language)
  // Поки відповідь не збігається з поточним запитом, вважаємо, що йде завантаження
  const isLoading = result.key !== requestKey
  // After a language switch the current cards stay on screen until the new titles arrive
  const showSkeleton = isLoading && !isLanguageReload(result.key, requestKey)
  const isSlow = isLoading && slowKey === requestKey

  // Load the category list (again after a language switch: names are localized).
  // The filter keeps its value: options are keyed and selected by slug.
  // A failure must not block the product list.
  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    api
      .get('/api/categories', { signal: controller.signal })
      .then((response) => {
        if (!cancelled) setCategories(response.data)
      })
      .catch(() => {
        // Keep only "All" (or the names already loaded) in the filter
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [language])

  // Пошук відправляємо не на кожну літеру, а після паузи в наборі
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(filters.search.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [filters.search])

  useEffect(() => {
    // Прапорець відкидає відповідь, якщо фільтри змінилися, поки йшов запит
    let cancelled = false
    const [requestParams] = JSON.parse(requestKey)

    api
      .get('/api/products', { params: requestParams })
      .then((response) => {
        if (cancelled) return
        const { items, total } = response.data
        setResult({ key: requestKey, items, total, error: null })
        // Якщо товарів стало менше, повертаємося на останню наявну сторінку
        const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
        if (requestParams.page > lastPage) setPage(lastPage)
      })
      .catch((error) => {
        if (cancelled) return
        setResult({
          key: requestKey,
          items: [],
          total: 0,
          error: getErrorKey(error, 'shop.loadError'),
        })
      })

    // Якщо запит триває довше 3 с, вмикаємо банер про повільний сервер
    const slowTimer = setTimeout(() => setSlowKey(requestKey), SLOW_REQUEST_MS)

    return () => {
      cancelled = true
      clearTimeout(slowTimer)
    }
  }, [requestKey])

  const { items: products, total, error } = result
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function handleRetry() {
    setAttempt((value) => value + 1)
  }

  function updateFilter(name, value) {
    setFilters((prev) => ({ ...prev, [name]: value }))
    // Для пошуку сторінку скидає debounce — разом із відправкою нового запиту
    if (name !== 'search') setPage(1)
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS)
    setQuery('')
    setPage(1)
  }

  return (
    <PageContainer title={t('shop.title')}>
      {/* Рядок керування: пошук, категорія, ціна, сортування */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
        <div className="col-span-2 flex flex-col gap-1">
          <label htmlFor="shop-search" className={labelClass}>
            {t('common.search')}
          </label>
          <input
            id="shop-search"
            type="search"
            placeholder={t('shop.searchPlaceholder')}
            maxLength={100}
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="shop-category" className={labelClass}>
            {t('common.category')}
          </label>
          <select
            id="shop-category"
            value={filters.category}
            onChange={(event) => updateFilter('category', event.target.value)}
            className={inputClass}
          >
            <option value="">{t('shop.all')}</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name} ({category.products_count})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="shop-min" className={labelClass}>
            {t('shop.minPrice')}
          </label>
          <input
            id="shop-min"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="0"
            value={filters.minPrice}
            onChange={(event) => updateFilter('minPrice', event.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="shop-max" className={labelClass}>
            {t('shop.maxPrice')}
          </label>
          <input
            id="shop-max"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder={t('shop.maxPlaceholder')}
            value={filters.maxPrice}
            onChange={(event) => updateFilter('maxPrice', event.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="shop-sort" className={labelClass}>
            {t('shop.sortBy')}
          </label>
          <select
            id="shop-sort"
            value={filters.sort}
            onChange={(event) => updateFilter('sort', event.target.value)}
            className={inputClass}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.key)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isSlow && <ServerWakingBanner />}
      {showSkeleton && <LoadingSkeleton variant="cards" />}

      {!showSkeleton && error && <ErrorState message={t(error)} onRetry={handleRetry} />}

      {!showSkeleton && !error && (
        <>
          <p className="text-sm text-gray-600 mb-8" aria-live="polite">
            {t('common.productsCount', { count: total })}
          </p>

          {products.length === 0 ? (
            <EmptyState
              title={t('shop.nothingFound')}
              text={t('shop.nothingFoundText')}
              actionLabel={t('common.resetFilters')}
              onAction={resetFilters}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <nav
                aria-label={t('common.pagination')}
                className="mt-10 flex items-center justify-center gap-4"
              >
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
            </>
          )}
        </>
      )}
    </PageContainer>
  )
}

export default ShopPage
