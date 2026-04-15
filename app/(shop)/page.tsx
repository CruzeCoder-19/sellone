import Link from "next/link";
import { Truck, CreditCard, RotateCcw, ShieldCheck } from "lucide-react";
import { getCategoryTree } from "@/server/queries/category.queries";
import { listFeaturedProducts } from "@/server/queries/product.queries";
import { CategoryTile } from "@/components/catalog/CategoryTile";
import { ProductCard } from "@/components/catalog/ProductCard";

export const metadata = {
  title: "Wolsell — Wholesale supplies, simplified",
  description:
    "Bulk pricing on hardware, sanitary, electrical, paints, and more. Register as a buyer or seller.",
};

export default async function HomePage() {
  const [tree, featured] = await Promise.all([
    getCategoryTree(),
    listFeaturedProducts(8),
  ]);

  const topLevel = tree.filter((c) => c.parentId === null);

  return (
    <>
      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-900 px-4 py-20 text-white sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Wholesale supplies, simplified
          </h1>
          <p className="mt-4 text-lg text-blue-200">
            Bulk pricing on hardware, sanitary, electrical, paints, and more.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/shop"
              className="rounded-lg bg-white px-6 py-3 font-semibold text-blue-700 shadow transition-colors hover:bg-blue-50"
            >
              Browse catalog
            </Link>
            <Link
              href="/sell-with-us"
              className="rounded-lg border border-white/40 bg-white/10 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/20"
            >
              Become a seller
            </Link>
          </div>
        </div>
      </section>

      {/* ── Shop by category ── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Shop by category</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {topLevel.map((cat) => (
            <CategoryTile
              key={cat.id}
              category={{
                name: cat.name,
                slug: cat.slug,
                image: null,
                productCount: cat.productCount,
              }}
            />
          ))}
        </div>
      </section>

      {/* ── Featured products ── */}
      <section className="bg-gray-50 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Featured</h2>
            <Link
              href="/shop"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="border-t border-gray-200 px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 sm:grid-cols-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <Truck className="h-8 w-8 text-blue-600" />
            <p className="text-sm font-semibold text-gray-800">Free shipping on bulk orders</p>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <CreditCard className="h-8 w-8 text-blue-600" />
            <p className="text-sm font-semibold text-gray-800">Wolsell Credit available</p>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <RotateCcw className="h-8 w-8 text-blue-600" />
            <p className="text-sm font-semibold text-gray-800">14-day returns</p>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
            <p className="text-sm font-semibold text-gray-800">Verified suppliers</p>
          </div>
        </div>
      </section>
    </>
  );
}
