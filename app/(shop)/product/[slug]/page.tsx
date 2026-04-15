import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/server/queries/product.queries";
import { getCategoryBySlug } from "@/server/queries/category.queries";
import { ProductGallery } from "@/components/catalog/ProductGallery";
import { TierPriceTable } from "@/components/catalog/TierPriceTable";
import { ProductPurchasePanel } from "@/components/catalog/ProductPurchasePanel";
import { RelatedProducts } from "@/components/catalog/RelatedProducts";
import type { CategoryBreadcrumb } from "@/types/catalog";

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found — Wolsell" };
  return {
    title: `${product.name} — Wolsell`,
    description: product.description ?? `Wholesale ${product.name} from Wolsell`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Resolve deepest category (longest breadcrumb chain = most specific).
  // getCategoryBySlug is unstable_cache-wrapped so parallel calls are cheap.
  let categoryBreadcrumb: CategoryBreadcrumb[] = [];
  let deepestCategoryId: string | null = null;

  if (product.categories.length > 0) {
    const resolved = await Promise.all(
      product.categories.map((cat) => getCategoryBySlug(cat.slug)),
    );
    for (let i = 0; i < resolved.length; i++) {
      const r = resolved[i];
      if (r && r.breadcrumb.length > categoryBreadcrumb.length) {
        categoryBreadcrumb = r.breadcrumb;
        deepestCategoryId = product.categories[i].id;
      }
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* ── Breadcrumb ── */}
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-gray-900">Home</Link>
        {categoryBreadcrumb.map((crumb) => (
          <span key={crumb.id} className="flex items-center gap-1.5">
            <span>/</span>
            <Link
              href={`/product-category/${crumb.slug}`}
              className="hover:text-gray-900"
            >
              {crumb.name}
            </Link>
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span>/</span>
          <span className="font-medium text-gray-900 line-clamp-1">{product.name}</span>
        </span>
      </nav>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <ProductGallery images={product.images} productName={product.name} />

        {/* Product info + purchase */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">{product.name}</h1>
            {product.brand && (
              <Link
                href={`/shop?brand=${product.brand.slug}`}
                className="mt-1 inline-block text-sm font-medium text-blue-600 hover:underline"
              >
                {product.brand.name}
              </Link>
            )}
            <p className="mt-1 text-xs text-gray-400">SKU: {product.sku}</p>
          </div>

          <TierPriceTable
            basePriceInPaise={product.basePriceInPaise}
            moq={product.moq}
            tierPrices={product.tierPrices}
          />

          <ProductPurchasePanel product={product} />
        </div>
      </div>

      {/* ── Description ── */}
      <div className="mt-12">
        <h2 className="mb-3 text-xl font-bold text-gray-900">Description</h2>
        <p className="max-w-3xl whitespace-pre-line text-gray-700 leading-relaxed">
          {product.description ?? "No description provided."}
        </p>
      </div>

      {/* ── Related products ── */}
      <RelatedProducts product={product} categoryId={deepestCategoryId} />
    </div>
  );
}
