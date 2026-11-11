// Generic confirmation dialog with Cancel and Confirm buttons
import Modal from './Modal'
import { btnPrimary, btnSecondary } from '../utils/styles'

function ConfirmModal({ title, text, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-gray-600">{text}</p>
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button type="button" onClick={onCancel} className={btnSecondary}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm} className={btnPrimary}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export default ConfirmModal
