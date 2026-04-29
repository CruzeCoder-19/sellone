import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCategoryBySlug } from "@/server/queries/category.queries";
import { listProducts } from "@/server/queries/product.queries";
import { getAllBrandsForFilter } from "@/server/queries/brand.queries";
import { ProductCard } from "@/components/catalog/ProductCard";
import { SortSelect } from "@/components/shop/SortSelect";
import type { ProductFilters, CategoryNode } from "@/types/catalog";

// ─────────────────────────────────────────────────────────────────────────────
// URL helper
// ─────────────────────────────────────────────────────────────────────────────

function buildFilterUrl(
  base: string,
  current: Record<string, string>,
  updates: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  params.delete("page");
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  sp,
}: {
  page: number;
  totalPages: number;
  sp: Record<string, string>;
}) {
  if (totalPages <= 1) return null;

  function pageUrl(p: number) {
    const params = new URLSearchParams(sp);
    params.set("page", p.toString());
    return `?${params.toString()}`;
  }

  const pages: (number | "ellipsis")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "ellipsis") {
      pages.push("ellipsis");
    }
  }

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      {page > 1 && (
        <Link
          href={pageUrl(page - 1)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          ← Prev
        </Link>
      )}
      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-gray-400">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={pageUrl(p)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              p === page
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {p}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link
          href={pageUrl(page + 1)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Next →
        </Link>
      )}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug: slugSegments } = await params;
  const rawSp = await searchParams;

  // Take the last URL segment as the category slug.
  // Earlier segments are for human-readable breadcrumb context only.
  const categorySlug = slugSegments[slugSegments.length - 1];

  const result = await getCategoryBySlug(categorySlug);
  if (!result) notFound();

  const { category, breadcrumb, descendantIds: _ } = result;

  // Normalise searchParams
  const sp: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawSp)) {
    if (typeof v === "string") sp[k] = v;
  }

  const brandSlug = sp.brand;
  const inStock = sp.inStock === "1";
  const sortBy = (sp.sort ?? "newest") as ProductFilters["sortBy"];
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  const filters: ProductFilters = {
    categorySlug,
    brandSlug,
    inStockOnly: inStock,
    sortBy,
    page,
    perPage: 24,
  };

  const [{ items, total, totalPages }, brands, { getCategoryTree }] = await Promise.all([
    listProducts(filters),
    getAllBrandsForFilter(),
    import("@/server/queries/category.queries"),
  ]);
  const tree = await getCategoryTree();

  // Build the current page's base URL from the slug array
  const baseUrl = `/product-category/${slugSegments.join("/")}`;

  function findNode(nodes: CategoryNode[], id: string): CategoryNode | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  }

  const categoryNode = findNode(tree, category.id);
  const children = categoryNode?.children ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-gray-900">Home</Link>
        {breadcrumb.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-1.5">
            <span>/</span>
            {i < breadcrumb.length - 1 ? (
              <Link
                href={`/product-category/${crumb.slug}`}
                className="hover:text-gray-900"
              >
                {crumb.name}
              </Link>
            ) : (
              <span className="font-medium text-gray-900">{crumb.name}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Heading */}
      <h1 className="mb-1 text-3xl font-extrabold text-gray-900">{category.name}</h1>
      <p className="mb-8 text-sm text-gray-500">{total} product{total !== 1 ? "s" : ""}</p>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* ── Sidebar ── */}
        <aside className="w-full flex-shrink-0 space-y-6 lg:w-64">
          {/* Sub-categories (only if current category has children) */}
          {children.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
                {category.name}
              </p>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link
                    href={baseUrl}
                    className="block rounded px-2 py-1 font-medium text-gray-700 hover:bg-gray-100"
                  >
                    All {category.name}
                  </Link>
                </li>
                {children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/product-category/${child.slug}`}
                      className="block rounded px-2 py-1 text-gray-700 hover:bg-gray-100"
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Brands */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
              Brand
            </p>
            <ul className="space-y-1 text-sm">
              <li>
                <Link
                  href={buildFilterUrl(baseUrl, sp, { brand: undefined })}
                  className={`block rounded px-2 py-1 ${
                    !brandSlug
                      ? "bg-blue-50 font-semibold text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  All brands
                </Link>
              </li>
              {brands.map((b) => (
                <li key={b.slug}>
                  <Link
                    href={buildFilterUrl(baseUrl, sp, { brand: b.slug })}
                    className={`block rounded px-2 py-1 ${
                      brandSlug === b.slug
                        ? "bg-blue-50 font-semibold text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {b.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Availability */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
              Availability
            </p>
            <Link
              href={buildFilterUrl(baseUrl, sp, {
                inStock: inStock ? undefined : "1",
              })}
              className={`inline-flex items-center gap-2 rounded px-2 py-1 text-sm ${
                inStock
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span
                className={`h-4 w-4 rounded border ${
                  inStock ? "border-blue-600 bg-blue-600" : "border-gray-400"
                } flex items-center justify-center`}
              >
                {inStock && (
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white" fill="currentColor">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                )}
              </span>
              In stock only
            </Link>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="flex-1">
          {/* Top bar */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {total} product{total !== 1 ? "s" : ""}
            </p>
            <Suspense fallback={<div className="h-9 w-40 rounded-md bg-gray-100" />}>
              <SortSelect currentSort={sortBy ?? "newest"} />
            </Suspense>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <p className="text-gray-500">No products match these filters.</p>
              <Link
                href={baseUrl}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} sp={sp} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug: slugSegments } = await params;
  const categorySlug = slugSegments[slugSegments.length - 1];
  const result = await getCategoryBySlug(categorySlug);
  if (!result) return { title: "Category not found — Wolsell" };
  return {
    title: `${result.category.name} — Wolsell`,
    description: `Browse wholesale ${result.category.name} products at bulk pricing.`,
  };
}
