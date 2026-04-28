import Link from "next/link";
import { getAdminStats } from "@/server/queries/admin.queries";
import { formatPaise } from "@/lib/format";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Dashboard — Wolsell" };

export default async function AdminDashboard() {
  const stats = await getAdminStats();

  const statCards = [
    { label: "Total Users", value: stats.totalUsers.toLocaleString("en-IN") },
    { label: "Total Orders", value: stats.totalOrders.toLocaleString("en-IN") },
    { label: "Total Products", value: stats.totalProducts.toLocaleString("en-IN") },
    { label: "Total Revenue", value: formatPaise(stats.totalRevenueInPaise) },
    {
      label: "Pending Shop Approvals",
      value: stats.pendingShops.toString(),
      highlight: stats.pendingShops > 0,
    },
    {
      label: "Pending Credit Apps",
      value: stats.pendingCreditApps.toString(),
      highlight: stats.pendingCreditApps > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Admin Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-5 shadow-sm ${card.highlight ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-white"}`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {card.label}
            </p>
            <p className={`mt-2 text-2xl font-semibold ${card.highlight ? "text-orange-700" : "text-gray-900"}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Pending action banners */}
      {stats.pendingShops > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-4">
          <p className="text-sm font-medium text-yellow-800">
            {stats.pendingShops} shop{stats.pendingShops !== 1 ? "s" : ""} awaiting approval
          </p>
          <Link
            href="/admin/shops?status=PENDING"
            className="rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-yellow-700"
          >
            Review →
          </Link>
        </div>
      )}

      {stats.pendingCreditApps > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
          <p className="text-sm font-medium text-blue-800">
            {stats.pendingCreditApps} credit application{stats.pendingCreditApps !== 1 ? "s" : ""} pending review
          </p>
          <Link
            href="/employee/credit"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Review →
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Quick Links</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { href: "/admin/users", label: "Manage Users" },
            { href: "/admin/orders", label: "View Orders" },
            { href: "/admin/coupons", label: "Manage Coupons" },
            { href: "/admin/audit-log", label: "Audit Log" },
            { href: "/employee/credit", label: "Credit Management" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
