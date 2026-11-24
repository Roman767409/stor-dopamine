import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

// Oldest entries are dropped once the list grows past this size
const MAX_FAVORITES = 100

const FavoritesContext = createContext(null)

// localStorage key of the favorites list; no key for a guest or while the session is checked
function getStorageKey(user, isLoading) {
  if (isLoading || !user) return null
  return `favorites:${user.id}`
}

// Keeps only non-empty strings, without duplicates, at most MAX_FAVORITES (newest first)
function sanitizeIds(value) {
  if (!Array.isArray(value)) return []
  const unique = [...new Set(value.filter((id) => typeof id === 'string' && id !== ''))]
  return unique.slice(0, MAX_FAVORITES)
}

// Reads the list from localStorage; returns an empty list if anything is wrong
function loadFavorites(storageKey) {
  if (!storageKey) return []
  try {
    const saved = localStorage.getItem(storageKey)
    if (!saved) return []
    return sanitizeIds(JSON.parse(saved))
  } catch {
    return []
  }
}

export function FavoritesProvider({ children }) {
  const { user, isLoading } = useAuth()
  const storageKey = getStorageKey(user, isLoading)

  // The key and the ids live TOGETHER, so the list always knows whose it is
  const [favorites, setFavorites] = useState(() => ({
    key: storageKey,
    ids: loadFavorites(storageKey),
  }))

  // The user changed (login, logout, another account): swap the list during render,
  // before any effect can save the old list under the new key
  if (favorites.key !== storageKey) {
    setFavorites({ key: storageKey, ids: loadFavorites(storageKey) })
  }

  // Save the list under ITS owner's key; a guest list is never saved
  useEffect(() => {
    if (!favorites.key) return
    try {
      localStorage.setItem(favorites.key, JSON.stringify(favorites.ids))
    } catch {
      // Storage is unavailable (e.g. private mode): the list just is not persisted
    }
  }, [favorites])

  // Changes the ids only when the list has an owner; does nothing for a guest
  function updateIds(change) {
    setFavorites((prev) => (prev.key ? { ...prev, ids: change(prev.ids) } : prev))
  }

  // Adds the id to the front (newest first) or removes it if it is already there
  function toggleFavorite(id) {
    updateIds((prevIds) =>
      prevIds.includes(id)
        ? prevIds.filter((item) => item !== id)
        : sanitizeIds([id, ...prevIds])
    )
  }

  function removeFavorite(id) {
    updateIds((prevIds) => (prevIds.includes(id) ? prevIds.filter((item) => item !== id) : prevIds))
  }

  // Removes several ids in one update (used to drop deleted products)
  function removeFavorites(idsToRemove) {
    const drop = new Set(idsToRemove)
    updateIds((prevIds) =>
      prevIds.some((id) => drop.has(id)) ? prevIds.filter((id) => !drop.has(id)) : prevIds
    )
  }

  // Until the list is swapped to the current owner's list, show an empty one
  const ids = favorites.key === storageKey ? favorites.ids : []

  function isFavorite(id) {
    return ids.includes(id)
  }

  const value = {
    ids,
    count: ids.length,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    removeFavorites,
  }

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

// The hook lives next to the provider so everything about favorites is in one file
// eslint-disable-next-line react-refresh/only-export-components
export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used inside <FavoritesProvider>')
  }
  return context
}
