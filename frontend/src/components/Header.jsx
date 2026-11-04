import { useState } from 'react'

const links = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/about', label: 'About us' },
]

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="relative border-b border-gray-200">
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4">
        <div className="shrink-0 bg-green-400 text-white font-bold rounded-lg px-4 md:px-6 py-2">
          Logo
        </div>

        {/* Меню для широких екранів */}
        <nav className="hidden md:flex gap-8 text-sm">
          {links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4 text-lg">
          <span className="text-sm font-medium whitespace-nowrap">100 000 DP</span>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <span>♡</span>
            <span>🛒</span>
            <span>👤</span>
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
            <a
              key={link.href}
              href={link.href}
              className="px-6 py-3 text-sm hover:bg-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  )
}

export default Header
