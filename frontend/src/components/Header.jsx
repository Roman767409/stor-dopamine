import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import LanguageSwitcher from './LanguageSwitcher'
import { formatDp } from '../utils/format'

// Main navigation; `key` is the translation key of the label
const links = [
  { href: '/', key: 'header.home' },
  { href: '/shop', key: 'header.shop' },
  { href: '/about', key: 'header.about' },
]

// Links in the profile menu
const profileLinks = [
  { href: '/orders', key: 'header.myOrders' },
  { href: '/dashboard', key: 'header.dashboard' },
  { href: '/tracking', key: 'header.tracking' },
  { href: '/profile', key: 'header.profile' },
]

function Header() {
  const { t } = useTranslation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef(null)
  const { totalItems } = useCart()
  const { count: favoritesCount } = useFavorites()
  const { user, isLoading, logout } = useAuth()

  // Close the profile menu on a click outside it or on Escape
  useEffect(() => {
    if (!isProfileOpen) return

    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }
    function handleEscape(event) {
      if (event.key === 'Escape') setIsProfileOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isProfileOpen])

  function handleLogout() {
    logout()
    setIsProfileOpen(false)
  }

  return (
    <header className="relative border-b border-gray-200">
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4">
        <div className="shrink-0 bg-green-400 text-white font-bold rounded-lg px-4 md:px-6 py-2">
          Logo
        </div>

        {/* Menu for wide screens */}
        <nav className="hidden md:flex gap-6 lg:gap-8 text-sm">
          {links.map((link) => (
            <Link key={link.href} to={link.href} className="whitespace-nowrap">
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4 text-lg">
          <LanguageSwitcher className="hidden md:flex" />
          {!isLoading && user && (
            <span className="text-sm font-medium whitespace-nowrap">
              {formatDp(user.virtual_balance)}
            </span>
          )}
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Link to="/favorites" className="relative" aria-label={t('header.favorites')}>
              <span>♡</span>
              {favoritesCount > 0 && (
                <span className="absolute -top-2 -right-3 min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-green-400 text-white text-xs font-bold">
                  {favoritesCount > 99 ? '99+' : favoritesCount}
                </span>
              )}
            </Link>
            <Link to="/cart" className="relative" aria-label={t('header.cart', { count: totalItems })}>
              <span>🛒</span>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-3 min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-green-400 text-white text-xs font-bold">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>
            {isLoading ? (
              // While the session is checked the icon just stays in place, without an action
              <span className="opacity-50">👤</span>
            ) : user ? (
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  aria-label={t('header.profileMenu')}
                  aria-expanded={isProfileOpen}
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                >
                  <span>👤</span>
                </button>
                {isProfileOpen && (
                  <div className="absolute right-0 top-full mt-3 z-20 w-56 bg-white border border-gray-200 rounded-xl shadow-md p-4 flex flex-col gap-3">
                    <p className="text-sm text-gray-600 truncate" title={user.email}>
                      {user.email}
                    </p>
                    <nav aria-label={t('header.account')} className="-mx-2 flex flex-col">
                      {profileLinks.map((link) => (
                        <Link
                          key={link.href}
                          to={link.href}
                          onClick={() => setIsProfileOpen(false)}
                          className="rounded-lg px-2 py-2 text-sm hover:bg-gray-100"
                        >
                          {t(link.key)}
                        </Link>
                      ))}
                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setIsProfileOpen(false)}
                          className="rounded-lg px-2 py-2 text-sm font-medium hover:bg-gray-100"
                        >
                          {t('header.adminPanel')}
                        </Link>
                      )}
                    </nav>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="bg-gray-200 hover:bg-gray-300 rounded-full px-4 py-2 text-sm font-medium"
                    >
                      {t('common.logOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" aria-label={t('common.logIn')}>
                <span>👤</span>
              </Link>
            )}
          </div>

          {/* Burger, only on narrow screens */}
          <button
            type="button"
            className="md:hidden shrink-0 flex flex-col justify-center gap-1.5 w-8 h-8"
            aria-label={isMenuOpen ? t('header.closeMenu') : t('header.openMenu')}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="block h-0.5 w-6 bg-gray-800" />
            <span className="block h-0.5 w-6 bg-gray-800" />
            <span className="block h-0.5 w-6 bg-gray-800" />
          </button>
        </div>
      </div>

      {/* Drop-down menu for phones */}
      {isMenuOpen && (
        <nav className="md:hidden absolute left-0 right-0 top-full z-10 flex flex-col bg-white border-b border-gray-200 shadow-md">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="px-6 py-3 text-sm hover:bg-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              {t(link.key)}
            </Link>
          ))}
          <div className="px-6 py-3 flex items-center justify-between gap-4 border-t border-gray-200">
            <span className="text-sm text-gray-600" aria-hidden="true">
              {t('header.language')}
            </span>
            <LanguageSwitcher />
          </div>
        </nav>
      )}
    </header>
  )
}

export default Header
