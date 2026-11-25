// Admin panel shell: side menu on desktop, horizontal menu on top on mobile
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'
import { focusRing } from '../utils/styles'

const ADMIN_LINKS = [
  { to: '/admin', key: 'admin.nav.products', end: true },
  { to: '/admin/logs', key: 'admin.nav.logs' },
  { to: '/admin/analytics', key: 'admin.nav.analytics' },
]

function AdminLayout() {
  const { t } = useTranslation()
  return (
    <main className="max-w-[1100px] mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row gap-6 md:gap-10">
        <nav aria-label={t('admin.nav.panel')} className="md:w-48 md:shrink-0">
          <p className="hidden md:block text-xs text-gray-600 mb-3">{t('admin.nav.panel')}</p>
          <ul className="flex flex-wrap md:flex-col gap-2">
            {ADMIN_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `block rounded-full px-4 py-2 text-sm font-medium ${
                      isActive ? 'bg-gray-900 text-white' : 'bg-gray-200 hover:bg-gray-300'
                    } ${focusRing}`
                  }
                >
                  {t(link.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </main>
  )
}

export default AdminLayout
