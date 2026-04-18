import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRoles } from "@/lib/auth/helpers";
import { getShopForUser } from "@/server/queries/seller.queries";
import { getSellerOrders } from "@/server/queries/seller-orders.queries";
import { updateOrderStatus } from "@/server/actions/seller-orders.actions";
import { formatPaise } from "@/lib/format";
import type { Metadata } from "next";
import type { OrderStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Orders — Wolsell Seller" };

const STATUS_TABS: { label: string; value: OrderStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Packed", value: "PACKED" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
];

const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  CONFIRMED: "bg-blue-50 text-blue-700",
  PACKED: "bg-yellow-50 text-yellow-700",
  SHIPPED: "bg-purple-50 text-purple-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
  RETURNED: "bg-orange-50 text-orange-700",
};

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  PAID: "bg-green-50 text-green-700",
  FAILED: "bg-red-50 text-red-700",
  REFUNDED: "bg-orange-50 text-orange-700",
};

const PAGE_SIZE = 20;

export default async function SellerOrdersPage({
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

  const { rows, total } = await getSellerOrders(shop.id, {
    page,
    pageSize: PAGE_SIZE,
    status: statusFilter === "ALL" ? undefined : (statusFilter as OrderStatus),
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Orders</h1>
        <p className="mt-0.5 text-sm text-gray-500">{total} order{total !== 1 ? "s" : ""} found</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.value;
          const href =
            tab.value === "ALL"
              ? "/seller/orders"
              : `/seller/orders?status=${tab.value}`;
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
          <p className="text-gray-500">No orders found.</p>
        </div>
      ) : (
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
              {rows.map((order) => {
                const sellerItems = order.items;
                const sellerTotal = sellerItems.reduce(
                  (sum, item) => sum + item.lineTotalInPaise,
                  0,
                );

                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{order.customer.name ?? "—"}</p>
                      <p className="text-xs text-gray-400">{order.customer.email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-right">{sellerItems.length}</td>
                    <td className="px-4 py-3 text-right">{formatPaise(sellerTotal)}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE[order.status]}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${PAYMENT_STATUS_BADGE[order.paymentStatus] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(order.placedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/seller/orders/${order.id}`}
                          className="rounded border border-gray-200 px-2.5 py-1 text-xs hover:bg-gray-50"
                        >
                          View
                        </Link>
                        {order.status === "CONFIRMED" && (
                          <form
                            action={async () => {
                              "use server";
                              await updateOrderStatus({ orderId: order.id, status: "PACKED" });
                            }}
                          >
                            <button
                              type="submit"
                              className="rounded border border-yellow-300 bg-yellow-50 px-2.5 py-1 text-xs text-yellow-700 hover:bg-yellow-100"
                            >
                              Mark Packed
                            </button>
                          </form>
                        )}
                        {order.status === "PACKED" && (
                          <form
                            action={async () => {
                              "use server";
                              await updateOrderStatus({ orderId: order.id, status: "SHIPPED" });
                            }}
                          >
                            <button
                              type="submit"
                              className="rounded border border-purple-300 bg-purple-50 px-2.5 py-1 text-xs text-purple-700 hover:bg-purple-100"
                            >
                              Mark Shipped
                            </button>
                          </form>
                        )}
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
              href={`/seller/orders?page=${page - 1}${statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}`}
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
              href={`/seller/orders?page=${page + 1}${statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}`}
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
