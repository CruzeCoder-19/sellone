"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function SearchInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = inputRef.current?.value.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1">
      <input
        ref={inputRef}
        name="q"
        type="search"
        placeholder="Search products..."
        className="h-9 w-48 rounded-md border border-gray-300 bg-white px-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-64"
      />
      <button
        type="submit"
        aria-label="Search"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
}
