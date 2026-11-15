import { useEffect, useState } from 'react'
import api from '../api'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingSkeleton from '../components/LoadingSkeleton'
import PageContainer from '../components/PageContainer'
import ServerWakingBanner from '../components/ServerWakingBanner'
import { formatDp } from '../utils/format'
import { btnSmall, focusRing, inputClass, labelClass } from '../utils/styles'

const PAGE_SIZE = 12
// Після цього часу очікування показуємо банер «сервер прокидається»
const SLOW_REQUEST_MS = 3000
// Затримка перед відправкою пошукового запиту
const SEARCH_DEBOUNCE_MS = 400

const SORT_OPTIONS = [
  { value: 'title_asc', label: 'Name A–Z' },
  { value: 'price_asc', label: 'Price low→high' },
  { value: 'price_desc', label: 'Price high→low' },
]

// TODO: replace with GET /api/categories
const CATEGORIES = [
  { slug: 'electronics', name: 'Електроніка' },
  { slug: 'accessories', name: 'Аксесуари' },
  { slug: 'clothing', name: 'Одяг' },
  { slug: 'home', name: 'Дім' },
]

const EMPTY_FILTERS = { search: '', category: '', minPrice: '', maxPrice: '', sort: 'title_asc' }

function ProductCard({ product }) {
  const { addToCart } = useCart()
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [isAdded, setIsAdded] = useState(false)

  // Через 1,5 с після натискання повертаємо текст кнопки назад
  useEffect(() => {
    if (!isAdded) return
    const timer = setTimeout(() => setIsAdded(false), 1500)
    return () => clearTimeout(timer)
  }, [isAdded])

  function handleAdd() {
    // Гість не має кошика — відправляємо його увійти
    if (!user) {
      navigate('/login')
      return
    }
    addToCart(product)
    setIsAdded(true)
  }

  return (
    <div className="flex flex-col gap-2">
      <Link
        to={`/product/${product.id}`}
        className={`group flex flex-col gap-2 rounded-xl ${focusRing}`}
      >
        <div className="bg-gray-200 rounded-xl aspect-square w-full" />
        <h2 className="font-semibold group-hover:underline">{product.title}</h2>
        <p className="text-sm text-gray-600">{product.category}</p>
        <p className="font-bold">{formatDp(product.price)} DP</p>
      </Link>
      <button
        type="button"
        onClick={handleAdd}
        disabled={isLoading}
        className={`mt-auto bg-gray-200 hover:bg-gray-300 rounded-full px-6 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200 ${focusRing}`}
      >
        {isAdded ? 'Added ✓' : 'Add to cart'}
      </button>
    </div>
  )
}

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
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  // Пошуковий рядок, який реально пішов у запит (оновлюється із затримкою)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  // Остання відповідь сервера разом із ключем запиту, якому вона належить
  const [result, setResult] = useState({ key: null, items: [], total: 0, error: null })
  const [slowKey, setSlowKey] = useState(null)

  const params = buildParams(filters, query, page)
  const requestKey = JSON.stringify([params, attempt])
  // Поки відповідь не збігається з поточним запитом, вважаємо, що йде завантаження
  const isLoading = result.key !== requestKey
  const isSlow = isLoading && slowKey === requestKey

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
          error: error.response?.data?.error?.message || 'Could not load products',
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
    <PageContainer title="Shop">
      {/* Рядок керування: пошук, категорія, ціна, сортування */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
        <div className="col-span-2 flex flex-col gap-1">
          <label htmlFor="shop-search" className={labelClass}>
            Search
          </label>
          <input
            id="shop-search"
            type="search"
            placeholder="Product name"
            maxLength={100}
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="shop-category" className={labelClass}>
            Category
          </label>
          <select
            id="shop-category"
            value={filters.category}
            onChange={(event) => updateFilter('category', event.target.value)}
            className={inputClass}
          >
            <option value="">All</option>
            {CATEGORIES.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="shop-min" className={labelClass}>
            Min price, DP
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
            Max price, DP
          </label>
          <input
            id="shop-max"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Any"
            value={filters.maxPrice}
            onChange={(event) => updateFilter('maxPrice', event.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="shop-sort" className={labelClass}>
            Sort by
          </label>
          <select
            id="shop-sort"
            value={filters.sort}
            onChange={(event) => updateFilter('sort', event.target.value)}
            className={inputClass}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <>
          {isSlow && <ServerWakingBanner />}
          <LoadingSkeleton variant="cards" />
        </>
      )}

      {!isLoading && error && <ErrorState message={error} onRetry={handleRetry} />}

      {!isLoading && !error && (
        <>
          <p className="text-sm text-gray-600 mb-8" aria-live="polite">
            {total} {total === 1 ? 'product' : 'products'}
          </p>

          {products.length === 0 ? (
            <EmptyState
              title="Nothing found"
              text="Try another name, category or price range."
              actionLabel="Reset filters"
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
                aria-label="Pagination"
                className="mt-10 flex items-center justify-center gap-4"
              >
                <button
                  type="button"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className={btnSmall}
                >
                  Previous
                </button>
                <span className="text-sm font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className={btnSmall}
                >
                  Next
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
