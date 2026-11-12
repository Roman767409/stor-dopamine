// Admin modal form for adding or editing a product (works on local state only)
import { useState } from 'react'
import FormField from './FormField'
import Modal from './Modal'
import { btnPrimary, btnSecondary, focusRing } from '../utils/styles'

function ProductFormModal({ product, categories, onSave, onCancel }) {
  const [values, setValues] = useState(() => ({
    title: product?.title ?? '',
    description: product?.description ?? '',
    category_slug: product?.category_slug ?? categories[0]?.slug ?? '',
    price: product ? String(product.price) : '',
    image_url: product?.image_url ?? '',
    is_active: product?.is_active ?? true,
  }))
  const [errors, setErrors] = useState({})

  function update(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  function validate() {
    const nextErrors = {}
    if (values.title.trim() === '') nextErrors.title = 'Enter a title'
    else if (values.title.trim().length > 120) nextErrors.title = 'Max 120 characters'
    if (!values.category_slug) nextErrors.category_slug = 'Choose a category'
    const price = Number(values.price)
    if (values.price === '' || Number.isNaN(price) || price <= 0) {
      nextErrors.price = 'Price must be greater than 0'
    }
    const imageUrl = values.image_url.trim()
    if (imageUrl && !/^https?:\/\//.test(imageUrl)) {
      nextErrors.image_url = 'URL must start with http:// or https://'
    }
    return nextErrors
  }

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const category = categories.find((item) => item.slug === values.category_slug)
    onSave({
      title: values.title.trim(),
      description: values.description.trim(),
      category: category?.name ?? '',
      category_slug: values.category_slug,
      price: Math.round(Number(values.price) * 100) / 100,
      image_url: values.image_url.trim() || null,
      is_active: values.is_active,
    })
  }

  return (
    <Modal title={product ? 'Edit product' : 'Add product'} onClose={onCancel}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <FormField
          id="product-title"
          label="Title"
          value={values.title}
          error={errors.title}
          onChange={(event) => update('title', event.target.value)}
        />
        <FormField
          id="product-description"
          label="Description"
          as="textarea"
          rows={3}
          value={values.description}
          onChange={(event) => update('description', event.target.value)}
        />
        <div className="grid grid-cols-2 gap-5">
          <FormField
            id="product-category"
            label="Category"
            as="select"
            value={values.category_slug}
            error={errors.category_slug}
            onChange={(event) => update('category_slug', event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </FormField>
          <FormField
            id="product-price"
            label="Price, DP"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={values.price}
            error={errors.price}
            onChange={(event) => update('price', event.target.value)}
          />
        </div>
        <FormField
          id="product-image"
          label="Image URL"
          type="url"
          placeholder="https://…"
          value={values.image_url}
          error={errors.image_url}
          onChange={(event) => update('image_url', event.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.is_active}
            onChange={(event) => update('is_active', event.target.checked)}
            className={`w-4 h-4 accent-gray-900 ${focusRing}`}
          />
          Active (visible in the shop)
        </label>

        <div className="mt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onCancel} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary}>
            {product ? 'Save changes' : 'Add product'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ProductFormModal
