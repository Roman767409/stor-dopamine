// Service page for the designer: every route of the app with links and testing tips
import { Link } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import { mockOrders, mockProducts } from '../mocks/mockData'
import { focusRing } from '../utils/styles'

const SCREENS = [
  { path: '/', name: 'Home', access: 'No' },
  { path: '/shop', name: 'Shop (catalog, filters, pagination)', access: 'No' },
  { path: `/product/${mockProducts[0].id}`, name: 'Product', access: 'No' },
  { path: '/cart', name: 'Cart', access: 'No' },
  { path: '/login', name: 'Log in / Sign up', access: 'No' },
  { path: '/checkout', name: 'Checkout', access: 'Yes' },
  { path: '/order-success', name: 'Order success (without an order redirects to /shop)', access: 'No' },
  { path: '/tracking', name: 'Track parcel', access: 'No' },
  { path: `/tracking/${mockOrders[0].tracking_number}`, name: 'Tracking result', access: 'No' },
  { path: '/orders', name: 'My orders', access: 'Yes' },
  { path: `/orders/${mockOrders[0].id}`, name: 'Order details', access: 'Yes' },
  { path: '/dashboard', name: 'Savings dashboard', access: 'Yes' },
  { path: '/profile', name: 'Profile', access: 'Yes' },
  { path: '/admin', name: 'Admin: products', access: 'Admin' },
  { path: '/admin/logs', name: 'Admin: logs', access: 'Admin' },
  { path: '/admin/analytics', name: 'Admin: analytics', access: 'Admin' },
  { path: '/screens', name: 'Screens index (this page)', access: 'No' },
  { path: '/page-that-does-not-exist', name: '404 Not found', access: 'No' },
]

const TIPS = [
  { path: '/orders?empty=1', text: 'shows the empty orders list.' },
  { path: null, text: 'Type "error" in the DopaBot chat (bottom-right button) to see its error state.' },
  { path: '/admin', text: 'opened by a non-admin user shows the 403 "no access" page.' },
  { path: '/checkout', text: 'accepts the test card 4242 4242 4242 4242, any future MM/YY and any 3-digit CVC; paying leads to the order success page.' },
  { path: '/tracking', text: 'try DS-1A2B3C4D5E (not found) or "abc" (wrong format).' },
]

const linkClass = `font-medium underline break-all rounded ${focusRing}`

function ScreensIndexPage() {
  return (
    <PageContainer title="Screens">
      <p className="-mt-4 mb-8 text-gray-600">
        All screens of DopamineStore. Pages marked "Yes" need a logged-in user, "Admin" needs the
        admin role.
      </p>

      <table className="w-full text-sm text-left">
        <thead className="border-b border-gray-200 text-xs text-gray-600">
          <tr>
            <th scope="col" className="py-3 pr-4 font-medium">
              Path
            </th>
            <th scope="col" className="py-3 px-2 font-medium">
              Screen
            </th>
            <th scope="col" className="py-3 pl-2 font-medium">
              Login
            </th>
          </tr>
        </thead>
        <tbody>
          {SCREENS.map((screen) => (
            <tr key={screen.path} className="border-b border-gray-200 align-top">
              <td className="py-3 pr-4">
                <Link to={screen.path} className={linkClass}>
                  {screen.path}
                </Link>
              </td>
              <td className="py-3 px-2">{screen.name}</td>
              <td className="py-3 pl-2 whitespace-nowrap">{screen.access}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-xl font-bold mt-10 mb-4">Tips</h2>
      <ul className="flex flex-col gap-2 text-sm list-disc pl-5">
        {TIPS.map((tip) => (
          <li key={tip.text}>
            {tip.path && (
              <>
                <Link to={tip.path} className={linkClass}>
                  {tip.path}
                </Link>{' '}
              </>
            )}
            {tip.text}
          </li>
        ))}
      </ul>
    </PageContainer>
  )
}

export default ScreensIndexPage
