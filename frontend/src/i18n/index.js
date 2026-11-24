// i18next setup: static resources (no flash of untranslated text), English by default,
// the user's choice is kept in localStorage under "lang". The browser language is ignored.
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import pl from '../locales/pl.json'
import uk from '../locales/uk.json'

const STORAGE_KEY = 'lang'
export const DEFAULT_LANGUAGE = 'en'

// `label` is what the switcher shows; `name` is the language's own name for screen readers
export const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'pl', label: 'PL', name: 'Polski' },
  { code: 'uk', label: 'UA', name: 'Українська' },
]

const SUPPORTED = LANGUAGES.map((language) => language.code)

// Saved language if it is one of ours, otherwise English
function readSavedLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return SUPPORTED.includes(saved) ? saved : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pl: { translation: pl },
    uk: { translation: uk },
  },
  lng: readSavedLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED,
  // React already escapes rendered strings
  interpolation: { escapeValue: false },
})

document.documentElement.lang = i18n.resolvedLanguage ?? DEFAULT_LANGUAGE

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Storage is unavailable: the choice lasts until the page is reloaded
  }
})

export default i18n
