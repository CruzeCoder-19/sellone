import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRoles } from "@/lib/auth/helpers";
import { getShopForUser } from "@/server/queries/seller.queries";
import { getSellerProducts } from "@/server/queries/seller-products.queries";
import { deleteProduct } from "@/server/actions/seller-products.actions";
import { formatPaise } from "@/lib/format";
import type { Metadata } from "next";
import type { ProductStatus } from "@prisma/client";

export const metadata: Metadata = { title: "My Products — Wolsell Seller" };

const STATUS_TABS: { label: string; value: ProductStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sold Out", value: "SOLD_OUT" },
  { label: "Archived", value: "ARCHIVED" },
];

const STATUS_BADGE: Record<ProductStatus, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  DRAFT: "bg-gray-100 text-gray-600",
  SOLD_OUT: "bg-orange-50 text-orange-700",
  ARCHIVED: "bg-red-50 text-red-700",
};

const PAGE_SIZE = 20;

export default async function SellerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const user = await requireRoles("SELLER");
  const shop = await getShopForUser(user.id);
  if (!shop) notFound();

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const statusFilter = STATUS_TABS.find((t) => t.value === params.status)?.value ?? "ALL";

  const { rows, total } = await getSellerProducts(shop.id, {
    page,
    pageSize: PAGE_SIZE,
    status: statusFilter === "ALL" ? undefined : (statusFilter as ProductStatus),
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">My Products</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total} product{total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/seller/products/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Add Product
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.value;
          const href =
            tab.value === "ALL"
              ? "/seller/products"
              : `/seller/products?status=${tab.value}`;
          return (
            <Link
              key={tab.value}
              href={href}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                active
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No products found.</p>
          <Link
            href="/seller/products/new"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Add your first product
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">SKU</th>
                <th className="px-4 py-3 text-right">Base Price</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((product) => {
                const firstImage = product.images[0];
                const imgUrl = firstImage
                  ? `/api/blobs/${firstImage.asset.store}/${firstImage.asset.key}`
                  : null;

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                          {imgUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imgUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-gray-300">
                              No img
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          {product.brand && (
                            <p className="text-xs text-gray-400">{product.brand.name}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{product.sku}</td>

                    {/* Base Price */}
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatPaise(product.basePriceInPaise)}
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3 text-right text-gray-700">
                      {product.stock.toLocaleString("en-IN")}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[product.status]}`}
                      >
                        {product.status.replace("_", " ")}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/seller/products/${product.id}/edit`}
                          className="rounded border border-gray-200 px-2.5 py-1 text-xs hover:bg-gray-50"
                        >
                          Edit
                        </Link>
                        <form
                          action={async () => {
                            "use server";
                            await deleteProduct(product.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                            onClick={(e) => {
                              if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) {
                                e.preventDefault();
                              }
                            }}
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/seller/products?page=${page - 1}${statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}`}
              className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/seller/products?page=${page + 1}${statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}`}
              className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
