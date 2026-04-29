export default function ShopLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar skeleton */}
        <aside className="w-full flex-shrink-0 space-y-4 lg:w-64">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 rounded bg-gray-200 animate-pulse" />
              {[...Array(5)].map((_, j) => (
                <div key={j} className="h-6 w-full rounded bg-gray-100 animate-pulse" />
              ))}
            </div>
          ))}
        </aside>

        {/* Product grid skeleton */}
        <div className="flex-1">
          <div className="mb-6 flex items-center justify-between">
            <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
            <div className="h-9 w-40 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-100 bg-white overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-5 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
