const categories = ['Category 1', 'Category 2', 'Category 3', 'Category 4', 'Category 5']

const timer = [
  { value: '01', label: 'Days' },
  { value: '01', label: 'Hours' },
  { value: '01', label: 'Minutes' },
  { value: '01', label: 'Seconds' },
]

function HomePage() {
  return (
    <main className="max-w-[1100px] mx-auto px-6 py-10 flex flex-col gap-16">
      {/* Hero */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Save up to 30% on impulse purchases
          </h1>
          <button className="self-start bg-gray-200 hover:bg-gray-300 rounded-full px-8 py-3 font-medium">
            Start Now
          </button>
        </div>
        <div className="bg-gray-200 rounded-xl h-72" />
      </section>

      {/* Featured Categories */}
      <section className="flex flex-col gap-8">
        <h2 className="text-2xl font-bold text-center">Featured Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {categories.map((name) => (
            <div key={name} className="flex flex-col items-center gap-3">
              <div className="bg-gray-200 rounded-xl aspect-square w-full" />
              <span className="text-sm font-medium">{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Banners */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-200 rounded-xl h-48" />
        <div className="bg-gray-200 rounded-xl h-48" />
      </section>

      {/* New year pack */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="flex flex-col gap-5">
          <h2 className="text-3xl font-bold">New year pack</h2>
          <p className="text-gray-600">Save up for bigger things</p>

          <div className="flex gap-4">
            {timer.map((item) => (
              <div key={item.label} className="flex flex-col items-center">
                <span className="bg-gray-200 rounded-xl w-16 h-16 flex items-center justify-center text-2xl font-bold">
                  {item.value}
                </span>
                <span className="text-xs text-gray-600 mt-2">{item.label}</span>
              </div>
            ))}
          </div>

          <button className="self-start bg-gray-200 hover:bg-gray-300 rounded-full px-8 py-3 font-medium">
            Buy Now
          </button>
        </div>
        <div className="bg-gray-200 rounded-xl h-72" />
      </section>

      {/* Footer placeholder */}
      <footer className="bg-gray-200 rounded-xl h-40" />
    </main>
  )
}

export default HomePage
