// Request keys of the data pages: a JSON array of the request parts with the UI language last.
// Product and category names come localized from the backend, so a language switch
// starts a new request, but the page may keep showing the data it already has meanwhile.

export function makeRequestKey(parts, language) {
  return JSON.stringify([...parts, language])
}

// True when the stored answer belongs to the same request in another language:
// the page keeps it on screen while the new language loads (no skeleton flash)
export function isLanguageReload(resultKey, requestKey) {
  if (!resultKey || resultKey === requestKey) return false
  const stored = JSON.parse(resultKey)
  const current = JSON.parse(requestKey)
  return JSON.stringify(stored.slice(0, -1)) === JSON.stringify(current.slice(0, -1))
}
