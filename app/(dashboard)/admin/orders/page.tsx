import Link from "next/link";
import { requireRoles } from "@/lib/auth/helpers";
import { getOrders } from "@/server/queries/admin.queries";
import { formatPaise } from "@/lib/format";
import type { Metadata } from "next";
import type { OrderStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Orders — Wolsell Admin" };

const ALL_STATUSES: OrderStatus[] = [
  "PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED",
];

const STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  CONFIRMED: "bg-blue-50 text-blue-700",
  PACKED: "bg-yellow-50 text-yellow-700",
  SHIPPED: "bg-purple-50 text-purple-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
  RETURNED: "bg-orange-50 text-orange-700",
};

const PAGE_SIZE = 20;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  await requireRoles("ADMIN");
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() || undefined;
  const statusFilter = ALL_STATUSES.find((s) => s === params.status) as OrderStatus | undefined;

  const { rows, total } = await getOrders({ page, pageSize: PAGE_SIZE, statusFilter, search });
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Orders</h1>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      {/* Filters */}
      <form method="get" className="flex flex-wrap gap-2">
        <input
          name="search"
          defaultValue={search}
          placeholder="Order number…"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          name="status"
          defaultValue={statusFilter ?? ""}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
          Filter
        </button>
        <Link href="/admin/orders" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
          Clear
        </Link>
      </form>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Order #</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-right">Items</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Payment</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{order.customer.name ?? "—"}</p>
                  <p className="text-xs text-gray-400">{order.customer.email ?? "—"}</p>
                </td>
                <td className="px-4 py-3 text-right">{order._count.items}</td>
                <td className="px-4 py-3 text-right">{formatPaise(order.totalInPaise)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {order.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(order.placedAt).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="rounded border border-gray-200 px-2.5 py-1 text-xs hover:bg-gray-50"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={`/admin/orders?page=${page - 1}${search ? `&search=${search}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}`}
              className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">← Previous</Link>
          )}
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={`/admin/orders?page=${page + 1}${search ? `&search=${search}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}`}
              className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">Next →</Link>
          )}
        </div>
      )}
    </div>
  );
}
