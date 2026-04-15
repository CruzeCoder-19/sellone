export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb skeleton */}
      <div className="mb-6 flex items-center gap-2">
        <div className="h-4 w-10 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-3 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-3 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-36 animate-pulse rounded bg-gray-200" />
      </div>

      {/* Two-column */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Gallery skeleton */}
        <div className="aspect-square w-full animate-pulse rounded-lg bg-gray-200" />

        {/* Info skeleton */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-8 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-1/4 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-1/5 animate-pulse rounded bg-gray-200" />
          </div>
          {/* Tier table skeleton */}
          <div className="h-24 w-full animate-pulse rounded-md bg-gray-200" />
          {/* Price skeleton */}
          <div className="h-10 w-1/2 animate-pulse rounded bg-gray-200" />
          {/* Qty skeleton */}
          <div className="h-10 w-40 animate-pulse rounded bg-gray-200" />
          {/* Button skeleton */}
          <div className="flex gap-3">
            <div className="h-10 flex-1 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>

      {/* Description skeleton */}
      <div className="mt-12 space-y-2">
        <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-4/6 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  );
}
