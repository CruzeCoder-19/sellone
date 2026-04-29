export default function BlogLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 h-8 w-32 rounded bg-gray-200 animate-pulse" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-white overflow-hidden animate-pulse">
            <div className="h-48 bg-gray-200" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
              <div className="h-3 bg-gray-100 rounded w-2/3 mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
