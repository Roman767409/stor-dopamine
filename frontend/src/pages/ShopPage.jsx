import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
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

const SORT_OPTIONS = [
  { value: 'name', label: 'Name A–Z' },
  { value: 'price-asc', label: 'Price low→high' },
  { value: 'price-desc', label: 'Price high→low' },
]

const EMPTY_FILTERS = { search: '', category: '', minPrice: '', maxPrice: '', sort: 'name' }

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
      {/* Картка веде на сторінку товару; товар передаємо в state, щоб не шукати його вдруге */}
      <Link
        to={`/product/${product.id}`}
        state={{ product }}
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

// Фільтрує та сортує товари на клієнті
function applyFilters(products, filters) {
  const search = filters.search.trim().toLowerCase()
  const min = filters.minPrice === '' ? null : Number(filters.minPrice)
  const max = filters.maxPrice === '' ? null : Number(filters.maxPrice)

  const result = products.filter((product) => {
    if (search && !product.title.toLowerCase().includes(search)) return false
    if (filters.category && product.category !== filters.category) return false
    if (min !== null && product.price < min) return false
    if (max !== null && product.price > max) return false
    return true
  })

  return result.sort((a, b) => {
    if (filters.sort === 'price-asc') return a.price - b.price
    if (filters.sort === 'price-desc') return b.price - a.price
    return a.title.localeCompare(b.title)
  })
}

function ShopPage() {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isSlow, setIsSlow] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)

  useEffect(() => {
    axios
      .get('http://127.0.0.1:8000/api/products')
      .then((response) => {
        setProducts(response.data)
      })
      .catch(() => {
        setError(true)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [attempt])

  // Якщо запит триває довше 3 с, вмикаємо банер про повільний сервер
  useEffect(() => {
    if (!isLoading) return
    const timer = setTimeout(() => setIsSlow(true), SLOW_REQUEST_MS)
    return () => clearTimeout(timer)
  }, [isLoading])

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category))].sort(),
    [products]
  )
  const filtered = useMemo(() => applyFilters(products, filters), [products, filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function handleRetry() {
    setError(false)
    setIsSlow(false)
    setIsLoading(true)
    setAttempt((value) => value + 1)
  }

  function updateFilter(name, value) {
    setFilters((prev) => ({ ...prev, [name]: value }))
    setPage(1)
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  return (
    <PageContainer title="Shop">
      {isLoading && (
        <>
          {isSlow && <ServerWakingBanner />}
          <LoadingSkeleton variant="cards" />
        </>
      )}

      {!isLoading && error && (
        <ErrorState message="Could not load products" onRetry={handleRetry} />
      )}

      {!isLoading && !error && (
        <>
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
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
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

          <p className="text-sm text-gray-600 mb-8" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
          </p>

          {filtered.length === 0 ? (
            <EmptyState
              title="Nothing found"
              text="Try another name, category or price range."
              actionLabel="Reset filters"
              onAction={resetFilters}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {visible.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <nav
                aria-label="Pagination"
                className="mt-10 flex items-center justify-center gap-4"
              >
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={btnSmall}
                >
                  Previous
                </button>
                <span className="text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
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
