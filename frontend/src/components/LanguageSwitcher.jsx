// Compact EN / PL / UA switch; the current language is highlighted.
// The choice is saved by the i18n setup (localStorage "lang") on every change.
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'
import { focusRing } from '../utils/styles'

function LanguageSwitcher({ className = '' }) {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage

  return (
    <div
      role="group"
      aria-label={t('header.language')}
      className={`flex shrink-0 items-center gap-0.5 rounded-full bg-gray-100 p-0.5 ${className}`}
    >
      {LANGUAGES.map((language) => {
        const isCurrent = language.code === current
        return (
          <button
            key={language.code}
            type="button"
            lang={language.code}
            aria-label={language.name}
            aria-pressed={isCurrent}
            onClick={() => {
              if (!isCurrent) i18n.changeLanguage(language.code)
            }}
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isCurrent ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-200'
            } ${focusRing}`}
          >
            {language.label}
          </button>
        )
      })}
    </div>
  )
}

export default LanguageSwitcher
