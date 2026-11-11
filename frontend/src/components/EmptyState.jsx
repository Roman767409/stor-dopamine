// Empty state block: gray placeholder icon, title, text and an optional action button
import { btnSecondary } from '../utils/styles'

function EmptyState({ title, text, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16">
      <div className="bg-gray-200 rounded-xl w-16 h-16 mb-2" aria-hidden="true" />
      <h2 className="text-xl font-bold">{title}</h2>
      {text && <p className="text-gray-600 max-w-md">{text}</p>}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className={`mt-3 ${btnSecondary}`}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default EmptyState
