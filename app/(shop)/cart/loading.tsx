export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 h-8 w-32 animate-pulse rounded bg-gray-200" />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-px rounded-lg border border-gray-200 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 bg-white p-4">
              <div className="h-20 w-20 flex-shrink-0 animate-pulse rounded-md bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-gray-200" />
                <div className="h-7 w-28 animate-pulse rounded bg-gray-200" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}
