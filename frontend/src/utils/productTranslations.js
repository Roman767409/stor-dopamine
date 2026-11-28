// Product translations as the admin API stores them: { en, pl, uk } (values may be null)

// Order of the languages in the form and in the request body
export const TRANSLATION_LANGUAGES = ['en', 'pl', 'uk']

// Trimmed non-empty values in a fixed key order, or null when nothing is left
export function cleanTranslations(value) {
  const cleaned = {}
  for (const language of TRANSLATION_LANGUAGES) {
    const text = typeof value?.[language] === 'string' ? value[language].trim() : ''
    if (text) cleaned[language] = text
  }
  return Object.keys(cleaned).length > 0 ? cleaned : null
}

export function sameTranslations(a, b) {
  return JSON.stringify(cleanTranslations(a)) === JSON.stringify(cleanTranslations(b))
}

// Title as the shop shows it: UI language -> English -> base title (same chain as the backend)
export function localizedTitle(product, language) {
  const translations = cleanTranslations(product?.title_i18n)
  return translations?.[language] ?? translations?.en ?? product?.title ?? ''
}
