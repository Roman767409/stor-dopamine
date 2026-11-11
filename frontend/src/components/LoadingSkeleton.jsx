// Gray pulsing placeholders shown while data is loading: "cards" grid or "list" rows
function LoadingSkeleton({ variant = 'cards', count }) {
  const total = count ?? (variant === 'cards' ? 8 : 4)
  const blocks = Array.from({ length: total }, (_, index) => index)

  return (
    <div role="status">
      <span className="sr-only">Loading…</span>
      {variant === 'cards' ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse"
          aria-hidden="true"
        >
          {blocks.map((index) => (
            <div key={index} className="flex flex-col gap-2">
              <div className="bg-gray-200 rounded-xl aspect-square w-full" />
              <div className="bg-gray-200 rounded h-5 w-3/4" />
              <div className="bg-gray-200 rounded h-4 w-1/2" />
              <div className="bg-gray-200 rounded h-5 w-1/3" />
              <div className="bg-gray-200 rounded-full h-9 w-full mt-2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col animate-pulse" aria-hidden="true">
          {blocks.map((index) => (
            <div key={index} className="flex items-center gap-4 py-4 border-b border-gray-200">
              <div className="bg-gray-200 rounded-xl w-20 h-20 shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="bg-gray-200 rounded h-5 w-1/2" />
                <div className="bg-gray-200 rounded h-4 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default LoadingSkeleton
