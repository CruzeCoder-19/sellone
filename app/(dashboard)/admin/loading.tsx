export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex gap-8">
        {/* Sidebar skeleton */}
        <aside className="hidden w-44 shrink-0 sm:block space-y-1">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </aside>

        {/* Main content skeleton */}
        <div className="flex-1 space-y-4">
          <div className="h-7 w-48 rounded bg-gray-200 animate-pulse" />
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="h-10 bg-gray-50 border-b border-gray-200 animate-pulse" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 border-b border-gray-100 px-4 flex items-center gap-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded flex-1" />
                <div className="h-4 bg-gray-100 rounded w-24" />
                <div className="h-6 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
