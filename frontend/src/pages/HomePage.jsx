import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'

// `key` is the translation key of the label
const timer = [
  { value: '01', key: 'home.days' },
  { value: '01', key: 'home.hours' },
  { value: '01', key: 'home.minutes' },
  { value: '01', key: 'home.seconds' },
]

function HomePage() {
  const { t } = useTranslation()
  // Featured categories from GET /api/categories; empty if the request fails
  const [categories, setCategories] = useState([])

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    api
      .get('/api/categories', { signal: controller.signal })
      .then((response) => {
        if (!cancelled) setCategories(response.data)
      })
      .catch(() => {
        // Leave the section without items; the rest of the page still works
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  return (
    <main className="max-w-[1100px] mx-auto px-6 py-10 flex flex-col gap-16">
      {/* Hero */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            {t('home.heroTitle')}
          </h1>
          <button className="self-start bg-gray-200 hover:bg-gray-300 rounded-full px-8 py-3 font-medium">
            {t('home.startNow')}
          </button>
        </div>
        <div className="bg-gray-200 rounded-xl h-72" />
      </section>

      {/* Featured Categories */}
      <section className="flex flex-col gap-8">
        <h2 className="text-2xl font-bold text-center">{t('home.featuredCategories')}</h2>
        {/* Centered wrapping row; card widths repeat the former 2/3/5-column grid */}
        <div className="flex flex-wrap justify-center gap-6">
          {categories.map((category) => (
            <div
              key={category.slug}
              className="flex flex-col items-center gap-3 w-[calc(50%-0.75rem)] sm:w-[calc(100%/3-1rem)] md:w-[calc(20%-1.2rem)]"
            >
              <div className="bg-gray-200 rounded-xl aspect-square w-full" />
              <span className="text-sm font-medium text-center break-words">{category.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Banners */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-200 rounded-xl h-48" />
        <div className="bg-gray-200 rounded-xl h-48" />
      </section>

      {/* New year pack */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="flex flex-col gap-5">
          <h2 className="text-3xl font-bold">{t('home.newYearPack')}</h2>
          <p className="text-gray-600">{t('home.newYearText')}</p>

          <div className="flex gap-4">
            {timer.map((item) => (
              <div key={item.key} className="flex flex-col items-center">
                <span className="bg-gray-200 rounded-xl w-16 h-16 flex items-center justify-center text-2xl font-bold">
                  {item.value}
                </span>
                <span className="text-xs text-gray-600 mt-2">{t(item.key)}</span>
              </div>
            ))}
          </div>

          <button className="self-start bg-gray-200 hover:bg-gray-300 rounded-full px-8 py-3 font-medium">
            {t('home.buyNow')}
          </button>
        </div>
        <div className="bg-gray-200 rounded-xl h-72" />
      </section>

      {/* Footer placeholder */}
      <footer className="bg-gray-200 rounded-xl h-40" />
    </main>
  )
}

export default HomePage
