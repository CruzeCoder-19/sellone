import Link from "next/link";
import { requireRoles } from "@/lib/auth/helpers";
import { getShops } from "@/server/queries/admin.queries";
import { ShopActionButtons } from "@/components/admin/ShopActionButtons";
import type { Metadata } from "next";
import type { ShopStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Shops — Wolsell Admin" };

const STATUS_TABS: { label: string; value: ShopStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Active", value: "ACTIVE" },
  { label: "Suspended", value: "SUSPENDED" },
];

const STATUS_BADGE: Record<ShopStatus, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  ACTIVE: "bg-green-50 text-green-700",
  SUSPENDED: "bg-orange-50 text-orange-700",
};

const PAGE_SIZE = 20;

export default async function AdminShopsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  await requireRoles("ADMIN");
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const statusFilter = STATUS_TABS.find((t) => t.value === params.status)?.value ?? "ALL";

  const { rows, total } = await getShops({
    page,
    pageSize: PAGE_SIZE,
    statusFilter: statusFilter === "ALL" ? undefined : (statusFilter as ShopStatus),
  });
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Shops</h1>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.value;
          const href = tab.value === "ALL" ? "/admin/shops" : `/admin/shops?status=${tab.value}`;
          return (
            <Link key={tab.value} href={href}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${active ? "border-blue-600 text-blue-600" : "border-transparent text-gray-600 hover:text-gray-900"}`}>
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Shop Name</th>
              <th className="px-4 py-3 text-left">Owner</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-left">GSTIN</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((shop) => (
              <tr key={shop.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{shop.name}</p>
                  <p className="text-xs text-gray-400">{shop.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{shop.owner.name ?? "—"}</p>
                  <p className="text-xs text-gray-400">{shop.owner.email ?? "—"}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[shop.status]}`}>
                    {shop.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{shop.gstin ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(shop.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3">
                  <ShopActionButtons shopId={shop.id} shopName={shop.name} status={shop.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No shops found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && <Link href={`/admin/shops?page=${page - 1}${statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}`}
            className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">← Previous</Link>}
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          {page < totalPages && <Link href={`/admin/shops?page=${page + 1}${statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}`}
            className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">Next →</Link>}
        </div>
      )}
    </div>
  );
}
