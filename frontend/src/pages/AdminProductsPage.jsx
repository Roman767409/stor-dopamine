// Admin "Products" screen: product table with add / edit / deactivate on local state (mock)
import { useState } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import ProductFormModal from '../components/ProductFormModal'
import { mockProducts } from '../mocks/mockData'
import { formatDp } from '../utils/format'
import { btnPrimary, btnSmall } from '../utils/styles'

// Unique categories from the mock products: [{ name, slug }]
const CATEGORIES = [
  ...new Map(mockProducts.map((product) => [product.category_slug, product.category])),
].map(([slug, name]) => ({ slug, name }))

function ActiveBadge({ isActive }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

function makeLocalId() {
  return globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}`
}

function AdminProductsPage() {
  const [products, setProducts] = useState(() =>
    mockProducts.map((product) => ({ ...product, is_active: true }))
  )
  // null — form closed, 'new' — adding, product object — editing
  const [editing, setEditing] = useState(null)
  const [toDeactivate, setToDeactivate] = useState(null)

  function handleSave(values) {
    if (editing === 'new') {
      setProducts((prev) => [{ ...values, id: makeLocalId() }, ...prev])
    } else {
      setProducts((prev) =>
        prev.map((product) => (product.id === editing.id ? { ...product, ...values } : product))
      )
    }
    setEditing(null)
  }

  function setActive(id, isActive) {
    setProducts((prev) =>
      prev.map((product) => (product.id === id ? { ...product, is_active: isActive } : product))
    )
  }

  function handleConfirmDeactivate() {
    setActive(toDeactivate.id, false)
    setToDeactivate(null)
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">Products</h1>
        <button type="button" onClick={() => setEditing('new')} className={btnPrimary}>
          Add product
        </button>
      </div>

      <table className="w-full text-sm text-left">
        <thead className="border-b border-gray-200 text-xs text-gray-600">
          <tr>
            <th scope="col" className="py-3 pr-4 font-medium">
              Title
            </th>
            <th scope="col" className="hidden sm:table-cell py-3 px-2 font-medium">
              Category
            </th>
            <th scope="col" className="py-3 px-2 font-medium text-right">
              Price
            </th>
            <th scope="col" className="hidden md:table-cell py-3 px-2 font-medium">
              Status
            </th>
            <th scope="col" className="py-3 pl-2 font-medium text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-gray-200 align-top">
              <td className="py-4 pr-4">
                <span
                  className={`font-medium break-words ${product.is_active ? '' : 'text-gray-500'}`}
                >
                  {product.title}
                </span>
                {/* On narrow screens category and status move under the title */}
                <span className="block sm:hidden text-xs text-gray-600">{product.category}</span>
                <span className="block md:hidden mt-1">
                  <ActiveBadge isActive={product.is_active} />
                </span>
              </td>
              <td className="hidden sm:table-cell py-4 px-2 text-gray-600">{product.category}</td>
              <td className="py-4 px-2 text-right whitespace-nowrap">
                {formatDp(product.price)} DP
              </td>
              <td className="hidden md:table-cell py-4 px-2">
                <ActiveBadge isActive={product.is_active} />
              </td>
              <td className="py-3 pl-2">
                <div className="flex flex-col lg:flex-row justify-end items-end gap-2">
                  <button type="button" onClick={() => setEditing(product)} className={btnSmall}>
                    Edit
                  </button>
                  {product.is_active ? (
                    <button
                      type="button"
                      onClick={() => setToDeactivate(product)}
                      className={btnSmall}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActive(product.id, true)}
                      className={btnSmall}
                    >
                      Activate
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <ProductFormModal
          product={editing === 'new' ? null : editing}
          categories={CATEGORIES}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {toDeactivate && (
        <ConfirmModal
          title="Deactivate product?"
          text={`"${toDeactivate.title}" will be hidden from the shop. You can activate it again later.`}
          confirmLabel="Deactivate"
          onConfirm={handleConfirmDeactivate}
          onCancel={() => setToDeactivate(null)}
        />
      )}
    </>
  )
}

export default AdminProductsPage
