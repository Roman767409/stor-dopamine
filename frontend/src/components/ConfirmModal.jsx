// Generic confirmation dialog with Cancel and Confirm buttons;
// isBusy disables both while the confirmed request is in flight
import Modal from './Modal'
import { btnPrimary, btnSecondary } from '../utils/styles'

function ConfirmModal({
  title,
  text,
  confirmLabel = 'Confirm',
  isBusy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-gray-600">{text}</p>
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={isBusy} className={btnSecondary}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm} disabled={isBusy} className={btnPrimary}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export default ConfirmModal
