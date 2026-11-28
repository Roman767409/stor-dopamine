// Current-language product titles for lists kept on the client (the cart).
// The cart in localStorage holds a snapshot of the title in the language it was added in;
// this hook loads the real title via GET /api/products/{id} for the UI language.
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'

// How many product requests run in parallel
const BATCH_SIZE = 6

// `${language}:${id}` -> title, or null when the product is gone (404 / invalid id).
// Shared by every component for the whole session, so a title is requested once per language.
const titles = new Map()
// `${language}:${id}` -> request in flight, so parallel callers do not repeat it
const pending = new Map()

function cacheKey(language, id) {
  return `${language}:${id}`
}

function loadTitle(id, language) {
  const key = cacheKey(language, id)
  if (titles.has(key)) return Promise.resolve()
  if (!pending.has(key)) {
    const request = api
      // Explicit language: the answer is cached under it even if the UI language changes meanwhile
      .get(`/api/products/${encodeURIComponent(id)}`, { headers: { 'Accept-Language': language } })
      .then(
        (response) => {
          titles.set(key, response.data.title)
        },
        (error) => {
          const status = error?.response?.status
          // Gone for good: remember it so the snapshot is used without new requests.
          // Other errors are not cached, so the next visit tries again.
          if (status === 404 || status === 422) titles.set(key, null)
        }
      )
      .finally(() => pending.delete(key))
    pending.set(key, request)
  }
  return pending.get(key)
}

// Returns titleOf(id, fallback): the title in the current UI language,
// or `fallback` (the stored snapshot) until it is loaded or if the product is gone
export function useLocalizedTitles(ids) {
  const { i18n } = useTranslation()
  const language = i18n.language
  const idsKey = JSON.stringify([...new Set(ids)].sort())
  // Bumped when new titles land in the shared cache, to re-render with them
  const [, setLoadedCount] = useState(0)

  useEffect(() => {
    const missing = JSON.parse(idsKey).filter((id) => !titles.has(cacheKey(language, id)))
    if (missing.length === 0) return

    let cancelled = false
    async function loadAll() {
      for (let start = 0; start < missing.length; start += BATCH_SIZE) {
        const batch = missing.slice(start, start + BATCH_SIZE)
        await Promise.all(batch.map((id) => loadTitle(id, language)))
        if (cancelled) return
        setLoadedCount((count) => count + batch.length)
      }
    }
    loadAll()

    return () => {
      cancelled = true
    }
  }, [idsKey, language])

  return function titleOf(id, fallback) {
    return titles.get(cacheKey(language, id)) ?? fallback
  }
}
