// Favorites screen: loads every saved product by id and drops the ones that no longer exist
import { useEffect, useEffectEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingSkeleton from '../components/LoadingSkeleton'
import PageContainer from '../components/PageContainer'
import ProductCard from '../components/ProductCard'
import { getErrorKey } from '../utils/apiErrors'
import { isLanguageReload, makeRequestKey } from '../utils/requestKey'

// How many product requests run in parallel
const BATCH_SIZE = 6

// 404: the product was deleted or deactivated; 422: the stored id is not a valid UUID
function isGone(reason) {
  const status = reason?.response?.status
  return status === 404 || status === 422
}

// Loads the products in batches of BATCH_SIZE parallel requests.
// `failure` is the first error other than "gone". Returns null if the loading was aborted.
async function loadProducts(ids, signal) {
  const products = {}
  const goneIds = []
  let failure = null

  for (let start = 0; start < ids.length; start += BATCH_SIZE) {
    const batch = ids.slice(start, start + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map((id) => api.get(`/api/products/${encodeURIComponent(id)}`, { signal }))
    )
    if (signal.aborted) return null

    results.forEach((result, index) => {
      const id = batch[index]
      if (result.status === 'fulfilled') {
        products[id] = result.value.data
      } else if (isGone(result.reason)) {
        goneIds.push(id)
      } else {
        failure ??= result.reason
      }
    })
  }

  return { products, goneIds, failure }
}

function FavoritesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { ids, removeFavorites } = useFavorites()
  const [attempt, setAttempt] = useState(0)
  // Last loading result together with the key of the request it belongs to (error is a translation key)
  const [result, setResult] = useState({ key: null, products: {}, error: null })

  // A new user, "Try again" or a language switch (titles are localized) starts a new loading;
  // removing a heart on this page does not
  const requestKey = makeRequestKey([user?.id ?? null, attempt], i18n.language)
  const hasFavorites = ids.length > 0
  // After a language switch the current cards stay on screen until the new titles arrive
  const isLoading =
    hasFavorites && result.key !== requestKey && !isLanguageReload(result.key, requestKey)

  // Reads the ids at the moment the loading starts, without making them an effect dependency
  const getIdsToLoad = useEffectEvent(() => ids)
  const dropGoneProducts = useEffectEvent((goneIds) => removeFavorites(goneIds))

  useEffect(() => {
    const idsToLoad = getIdsToLoad()
    if (idsToLoad.length === 0) return

    const controller = new AbortController()

    loadProducts(idsToLoad, controller.signal).then((loaded) => {
      if (!loaded) return
      // Deleted or deactivated products leave the favorites list for good
      if (loaded.goneIds.length > 0) dropGoneProducts(loaded.goneIds)
      setResult({
        key: requestKey,
        products: loaded.products,
        error: loaded.failure ? getErrorKey(loaded.failure, 'favorites.loadError') : null,
      })
    })

    return () => {
      controller.abort()
    }
  }, [requestKey])

  // Cards follow the current list order (newest first); a removed heart hides its card at once
  const products = ids.map((id) => result.products[id]).filter(Boolean)

  let content
  if (isLoading) {
    content = <LoadingSkeleton variant="cards" count={Math.min(ids.length, 8)} />
  } else if (hasFavorites && result.error) {
    content = <ErrorState message={t(result.error)} onRetry={() => setAttempt((value) => value + 1)} />
  } else if (products.length === 0) {
    content = (
      <EmptyState
        title={t('favorites.emptyTitle')}
        text={t('favorites.emptyText')}
        actionLabel={t('common.goToShop')}
        onAction={() => navigate('/shop')}
      />
    )
  } else {
    content = (
      <>
        <p className="text-sm text-gray-600 mb-8" aria-live="polite">
          {t('common.productsCount', { count: products.length })}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </>
    )
  }

  return <PageContainer title={t('favorites.title')}>{content}</PageContainer>
}

export default FavoritesPage
