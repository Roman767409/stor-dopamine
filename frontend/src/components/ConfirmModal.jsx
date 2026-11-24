// Generic confirmation dialog with Cancel and Confirm buttons;
// isBusy disables both while the confirmed request is in flight
import { useTranslation } from 'react-i18next'
import Modal from './Modal'
import { btnPrimary, btnSecondary } from '../utils/styles'

function ConfirmModal({ title, text, confirmLabel, isBusy = false, onConfirm, onCancel }) {
  const { t } = useTranslation()
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-gray-600">{text}</p>
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={isBusy} className={btnSecondary}>
          {t('common.cancel')}
        </button>
        <button type="button" onClick={onConfirm} disabled={isBusy} className={btnPrimary}>
          {confirmLabel ?? t('common.confirm')}
        </button>
      </div>
    </Modal>
  )
}

export default ConfirmModal
