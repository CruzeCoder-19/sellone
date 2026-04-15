import { searchProducts } from "@/server/queries/product.queries";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SearchInput } from "@/components/shop/SearchInput";

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  return {
    title: q ? `Search: ${q} — Wolsell` : "Search — Wolsell",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  if (!q) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Search products</h1>
        <SearchInput />
        <p className="mt-4 text-sm text-gray-500">Enter a search term above to find products.</p>
      </div>
    );
  }

  const results = await searchProducts(q, 48);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">
        {results.length > 0
          ? `${results.length} result${results.length !== 1 ? "s" : ""} for `
          : "No results for "}
        <span className="text-blue-600">&ldquo;{q}&rdquo;</span>
      </h1>

      {results.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-gray-500">
            No products match &ldquo;{q}&rdquo;. Try a different search term.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
