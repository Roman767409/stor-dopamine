// Admin modal form for adding or editing a product; the parent sends the request
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import FormField from './FormField'
import Modal from './Modal'
import { TRANSLATION_LANGUAGES, cleanTranslations } from '../utils/productTranslations'
import { btnPrimary, btnSecondary, errorClass, focusRing } from '../utils/styles'

// Backend limits (app/schemas/admin_products.py)
const TITLE_MAX_LENGTH = 120
const IMAGE_URL_MAX_LENGTH = 500
// Positive number with at most 10 integer digits and 2 decimals (Numeric(12, 2))
const PRICE_PATTERN = /^\d{1,10}(\.\d{1,2})?$/

// Translation keys of the language names shown in the "Translations" block
const LANGUAGE_NAME_KEYS = {
  en: 'admin.products.form.languages.en',
  pl: 'admin.products.form.languages.pl',
  uk: 'admin.products.form.languages.uk',
}

// Form values for { en, pl, uk } translations: every language present, '' when missing
function translationValues(translations) {
  return Object.fromEntries(
    TRANSLATION_LANGUAGES.map((language) => [language, translations?.[language] ?? ''])
  )
}

// categories: [{ id, name, slug }] from GET /api/categories;
// isSaving disables the buttons, serverError is shown above them
// serverError is already translated by the parent.
// The form edits the BASE title and description (as the admin API returns them)
// plus the optional translations title_i18n / description_i18n.
function ProductFormModal({ product, categories, isSaving, serverError, onSave, onCancel }) {
  const { t } = useTranslation()
  const [values, setValues] = useState(() => ({
    title: product?.title ?? '',
    description: product?.description ?? '',
    category_id: String(product?.category?.id ?? categories[0]?.id ?? ''),
    price: product ? String(product.price) : '',
    image_url: product?.image_url ?? '',
    is_active: product?.is_active ?? true,
    title_i18n: translationValues(product?.title_i18n),
    description_i18n: translationValues(product?.description_i18n),
  }))
  // Field errors as [translationKey, options], translated while rendering
  const [errors, setErrors] = useState({})

  function update(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  // field: 'title_i18n' or 'description_i18n'
  function updateTranslation(field, language, value) {
    setValues((prev) => ({ ...prev, [field]: { ...prev[field], [language]: value } }))
  }

  function validate() {
    const nextErrors = {}
    if (values.title.trim() === '') nextErrors.title = ['admin.products.form.titleRequired']
    else if (values.title.trim().length > TITLE_MAX_LENGTH) {
      nextErrors.title = ['admin.products.form.maxLength', { count: TITLE_MAX_LENGTH }]
    }
    // Translated titles are optional; a filled one has the same limit as the base title
    for (const language of TRANSLATION_LANGUAGES) {
      if (values.title_i18n[language].trim().length > TITLE_MAX_LENGTH) {
        nextErrors[`title_i18n.${language}`] = [
          'admin.products.form.maxLength',
          { count: TITLE_MAX_LENGTH },
        ]
      }
    }
    if (!values.category_id) nextErrors.category_id = ['admin.products.form.categoryRequired']
    const price = values.price.trim()
    if (!PRICE_PATTERN.test(price) || Number(price) <= 0) {
      nextErrors.price = ['admin.products.form.priceInvalid']
    }
    const imageUrl = values.image_url.trim()
    if (imageUrl && !/^https?:\/\//.test(imageUrl)) {
      nextErrors.image_url = ['admin.products.form.urlInvalid']
    } else if (imageUrl.length > IMAGE_URL_MAX_LENGTH) {
      nextErrors.image_url = ['admin.products.form.maxLength', { count: IMAGE_URL_MAX_LENGTH }]
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
      // Only the filled languages; null when there are none
      title_i18n: cleanTranslations(values.title_i18n),
      description_i18n: cleanTranslations(values.description_i18n),
    })
  }

  function errorText(name) {
    const error = errors[name]
    return error ? t(error[0], error[1]) : undefined
  }

  return (
    <Modal title={product ? t('admin.products.form.editTitle') : t('admin.products.form.addTitle')} onClose={onCancel}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <FormField
          id="product-title"
          label={t('admin.products.form.title')}
          value={values.title}
          error={errorText('title')}
          onChange={(event) => update('title', event.target.value)}
        />
        <FormField
          id="product-description"
          label={t('admin.products.form.description')}
          as="textarea"
          rows={3}
          value={values.description}
          onChange={(event) => update('description', event.target.value)}
        />
        <div className="grid grid-cols-2 gap-5">
          <FormField
            id="product-category"
            label={t('admin.products.form.category')}
            as="select"
            value={values.category_id}
            error={errorText('category_id')}
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
            label={t('admin.products.form.price')}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={values.price}
            error={errorText('price')}
            onChange={(event) => update('price', event.target.value)}
          />
        </div>
        <FormField
          id="product-image"
          label={t('admin.products.form.imageUrl')}
          type="url"
          placeholder="https://…"
          value={values.image_url}
          error={errorText('image_url')}
          onChange={(event) => update('image_url', event.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.is_active}
            onChange={(event) => update('is_active', event.target.checked)}
            className={`w-4 h-4 accent-gray-900 ${focusRing}`}
          />
          {t('admin.products.form.isActive')}
        </label>

        {/* A legend is not a flex item, so the fields get their own flex wrapper */}
        <fieldset>
          <legend className="text-sm font-semibold">{t('admin.products.form.translations')}</legend>
          <p className="mt-1 mb-5 text-xs text-gray-600">{t('admin.products.form.translationsHint')}</p>
          <div className="flex flex-col gap-5">
            {TRANSLATION_LANGUAGES.map((language) => {
              const languageName = t(LANGUAGE_NAME_KEYS[language])
              return (
                <div key={language} className="flex flex-col gap-3">
                  <FormField
                    id={`product-title-${language}`}
                    lang={language}
                    label={t('admin.products.form.translationTitle', { language: languageName })}
                    value={values.title_i18n[language]}
                    error={errorText(`title_i18n.${language}`)}
                    onChange={(event) => updateTranslation('title_i18n', language, event.target.value)}
                  />
                  <FormField
                    id={`product-description-${language}`}
                    lang={language}
                    label={t('admin.products.form.translationDescription', {
                      language: languageName,
                    })}
                    as="textarea"
                    rows={2}
                    value={values.description_i18n[language]}
                    onChange={(event) =>
                      updateTranslation('description_i18n', language, event.target.value)
                    }
                  />
                </div>
              )
            })}
          </div>
        </fieldset>

        {serverError && (
          <p role="alert" className={errorClass}>
            {serverError}
          </p>
        )}

        <div className="mt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={isSaving} className={btnSecondary}>
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={isSaving} className={btnPrimary}>
            {product ? t('admin.products.form.save') : t('admin.products.add')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ProductFormModal
