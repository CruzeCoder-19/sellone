"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-extrabold text-red-500">500</p>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Something went wrong</h1>
      <p className="mt-2 max-w-md text-gray-500">
        {isDev && error.message
          ? error.message
          : "An unexpected error occurred. Please try again."}
      </p>
      {error.digest && (
        <p className="mt-1 font-mono text-xs text-gray-400">Ref: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
