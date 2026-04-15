export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Simulate the top bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-9 w-36 animate-pulse rounded-md bg-gray-200" />
      </div>

      {/* Skeleton grid — 4 columns, 8 cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            {/* Image placeholder */}
            <div className="aspect-[4/3] w-full animate-pulse bg-gray-200" />
            {/* Content placeholder */}
            <div className="space-y-2 p-3">
              <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-3/5 animate-pulse rounded bg-gray-200" />
              <div className="mt-2 h-5 w-1/2 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
