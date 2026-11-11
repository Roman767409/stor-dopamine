// Page wrapper with the same width, paddings and h1 style as the Shop and Cart pages
function PageContainer({ title, children }) {
  return (
    <main className="max-w-[1100px] mx-auto px-6 py-10">
      {title && <h1 className="text-3xl font-bold mb-8">{title}</h1>}
      {children}
    </main>
  )
}

export default PageContainer
