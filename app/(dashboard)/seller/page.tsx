import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth/helpers";
import { getShopForUser, getSellerStats } from "@/server/queries/seller.queries";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Seller Dashboard — Wolsell" };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Under Review",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  CLOSED: "Closed",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  ACTIVE: "bg-green-50 text-green-700",
  SUSPENDED: "bg-orange-50 text-orange-700",
  CLOSED: "bg-red-50 text-red-700",
};

export default async function SellerDashboard() {
  const user = await requireRoles("SELLER");

  const shop = await getShopForUser(user.id);
  if (!shop) redirect("/sell-with-us/apply");

  const stats = await getSellerStats(shop.id);

  const logoUrl =
    shop.logoAsset
      ? `/api/blobs/${shop.logoAsset.store}/${shop.logoAsset.key}`
      : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{shop.name}</h1>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[shop.status] ?? "bg-gray-100 text-gray-600"}`}
            >
              {STATUS_LABELS[shop.status] ?? shop.status}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            Joined {new Date(shop.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Products Listed
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.productCount}</p>
          <Link
            href="/seller/products"
            className="mt-2 inline-block text-xs text-blue-600 hover:underline"
          >
            Manage products →
          </Link>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Order Items This Month
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {stats.orderItemsThisMonth}
          </p>
          <Link
            href="/seller/orders"
            className="mt-2 inline-block text-xs text-blue-600 hover:underline"
          >
            View orders →
          </Link>
        </div>
      </div>

      {/* Shop profile card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <h2 className="text-base font-semibold">Shop Profile</h2>
          <Link
            href="/seller/profile"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
          >
            Edit Profile
          </Link>
        </div>

        <div className="mt-4 flex items-start gap-4">
          {/* Logo */}
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`${shop.name} logo`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-bold text-gray-300">
                {shop.name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          {/* Details */}
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {shop.description && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase text-gray-500">Description</dt>
                <dd className="mt-0.5 text-gray-700">{shop.description}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Address</dt>
              <dd className="mt-0.5 text-gray-700">{shop.businessAddress}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Phone</dt>
              <dd className="mt-0.5 text-gray-700">{shop.phone}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Email</dt>
              <dd className="mt-0.5 text-gray-700">{shop.email}</dd>
            </div>
            {shop.gstin && (
              <div>
                <dt className="text-xs font-medium uppercase text-gray-500">GSTIN</dt>
                <dd className="mt-0.5 font-mono text-gray-700">{shop.gstin}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
