// Admin modal form for adding or editing a product; the parent sends the request
import { useState } from 'react'
import FormField from './FormField'
import Modal from './Modal'
import { btnPrimary, btnSecondary, errorClass, focusRing } from '../utils/styles'

// Backend limits (app/schemas/admin_products.py)
const TITLE_MAX_LENGTH = 120
const IMAGE_URL_MAX_LENGTH = 500
// Positive number with at most 10 integer digits and 2 decimals (Numeric(12, 2))
const PRICE_PATTERN = /^\d{1,10}(\.\d{1,2})?$/

// categories: [{ id, name, slug }] from GET /api/categories;
// isSaving disables the buttons, serverError is shown above them
function ProductFormModal({ product, categories, isSaving, serverError, onSave, onCancel }) {
  const [values, setValues] = useState(() => ({
    title: product?.title ?? '',
    description: product?.description ?? '',
    category_id: String(product?.category?.id ?? categories[0]?.id ?? ''),
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
    else if (values.title.trim().length > TITLE_MAX_LENGTH) {
      nextErrors.title = `Max ${TITLE_MAX_LENGTH} characters`
    }
    if (!values.category_id) nextErrors.category_id = 'Choose a category'
    const price = values.price.trim()
    if (!PRICE_PATTERN.test(price) || Number(price) <= 0) {
      nextErrors.price = 'Price must be greater than 0, with at most 2 decimal places'
    }
    const imageUrl = values.image_url.trim()
    if (imageUrl && !/^https?:\/\//.test(imageUrl)) {
      nextErrors.image_url = 'URL must start with http:// or https://'
    } else if (imageUrl.length > IMAGE_URL_MAX_LENGTH) {
      nextErrors.image_url = `Max ${IMAGE_URL_MAX_LENGTH} characters`
    }
    return nextErrors
  }

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || isSaving) return

    // Price goes as a string so the backend Decimal gets exactly what was typed
    onSave({
      title: values.title.trim(),
      description: values.description.trim(),
      category_id: Number(values.category_id),
      price: values.price.trim(),
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
            value={values.category_id}
            error={errors.category_id}
            onChange={(event) => update('category_id', event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
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

        {serverError && (
          <p role="alert" className={errorClass}>
            {serverError}
          </p>
        )}

        <div className="mt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={isSaving} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={isSaving} className={btnPrimary}>
            {product ? 'Save changes' : 'Add product'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ProductFormModal
