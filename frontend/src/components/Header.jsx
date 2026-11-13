import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

// 95500 -> "95 500"
function formatDp(amount) {
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const links = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/about', label: 'About us' },
]

// Посилання в меню профілю
const profileLinks = [
  { href: '/orders', label: 'My orders' },
  { href: '/dashboard', label: 'Savings dashboard' },
  { href: '/tracking', label: 'Track parcel' },
  { href: '/profile', label: 'Profile' },
]

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef(null)
  const { totalItems } = useCart()
  const { user, isLoading, logout } = useAuth()

  // Закриваємо меню профілю кліком поза ним або клавішею Escape
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

        {/* Меню для широких екранів */}
        <nav className="hidden md:flex gap-8 text-sm">
          {links.map((link) => (
            <Link key={link.href} to={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4 text-lg">
          {!isLoading && user && (
            <span className="text-sm font-medium whitespace-nowrap">
              {formatDp(user.virtual_balance)} DP
            </span>
          )}
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <span>♡</span>
            <Link to="/cart" className="relative" aria-label={`Cart, ${totalItems} items`}>
              <span>🛒</span>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-3 min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-green-400 text-white text-xs font-bold">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>
            {isLoading ? (
              // Поки перевіряється сесія, іконка просто стоїть на місці, без дії
              <span className="opacity-50">👤</span>
            ) : user ? (
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  aria-label="Profile menu"
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
                    <nav aria-label="Account" className="-mx-2 flex flex-col">
                      {profileLinks.map((link) => (
                        <Link
                          key={link.href}
                          to={link.href}
                          onClick={() => setIsProfileOpen(false)}
                          className="rounded-lg px-2 py-2 text-sm hover:bg-gray-100"
                        >
                          {link.label}
                        </Link>
                      ))}
                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setIsProfileOpen(false)}
                          className="rounded-lg px-2 py-2 text-sm font-medium hover:bg-gray-100"
                        >
                          Admin panel
                        </Link>
                      )}
                    </nav>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="bg-gray-200 hover:bg-gray-300 rounded-full px-4 py-2 text-sm font-medium"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" aria-label="Log in">
                <span>👤</span>
              </Link>
            )}
          </div>

          {/* Бургер, видно лише на вузьких екранах */}
          <button
            type="button"
            className="md:hidden shrink-0 flex flex-col justify-center gap-1.5 w-8 h-8"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="block h-0.5 w-6 bg-gray-800" />
            <span className="block h-0.5 w-6 bg-gray-800" />
            <span className="block h-0.5 w-6 bg-gray-800" />
          </button>
        </div>
      </div>

      {/* Випадне меню для телефонів */}
      {isMenuOpen && (
        <nav className="md:hidden absolute left-0 right-0 top-full z-10 flex flex-col bg-white border-b border-gray-200 shadow-md">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="px-6 py-3 text-sm hover:bg-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}

export default Header
