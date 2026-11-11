// Error block with a message and a "Try again" button
import { btnSecondary } from '../utils/styles'

function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center text-center gap-4 py-16">
      <p className="text-red-600 font-medium">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={btnSecondary}>
          Try again
        </button>
      )}
    </div>
  )
}

export default ErrorState
