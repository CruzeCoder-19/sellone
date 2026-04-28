import { notFound } from "next/navigation";
import { requireRoles } from "@/lib/auth/helpers";
import { getOrderDetail } from "@/server/queries/admin.queries";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { formatPaise } from "@/lib/format";
import type { Metadata } from "next";
import type { OrderStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Order Detail — Wolsell Admin" };

const STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  CONFIRMED: "bg-blue-50 text-blue-700",
  PACKED: "bg-yellow-50 text-yellow-700",
  SHIPPED: "bg-purple-50 text-purple-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
  RETURNED: "bg-orange-50 text-orange-700",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  await requireRoles("ADMIN");
  const { orderId } = await params;
  const order = await getOrderDetail(orderId);
  if (!order) notFound();

  const addr = order.shippingAddressSnapshot as {
    name?: string; line1?: string; line2?: string; city?: string; state?: string; pincode?: string;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{order.orderNumber}</h1>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[order.status]}`}>
            {order.status}
          </span>
        </div>
        <a href="/admin/orders" className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
          ← Back
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Customer */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Customer</p>
          <p className="font-medium">{order.customer.name ?? "—"}</p>
          <p className="text-sm text-gray-500">{order.customer.email ?? "—"}</p>
          {order.customer.phone && <p className="text-sm text-gray-500">{order.customer.phone}</p>}
        </div>

        {/* Shipping address */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Shipping Address</p>
          {addr.name && <p className="font-medium">{addr.name}</p>}
          {addr.line1 && <p className="text-sm text-gray-700">{addr.line1}</p>}
          {addr.line2 && <p className="text-sm text-gray-700">{addr.line2}</p>}
          {(addr.city || addr.state || addr.pincode) && (
            <p className="text-sm text-gray-700">
              {[addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")}
            </p>
          )}
        </div>

        {/* Payment */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Payment</p>
          <p className="text-sm"><span className="text-gray-500">Method:</span> {order.paymentMethod}</p>
          <p className="text-sm"><span className="text-gray-500">Status:</span> {order.paymentStatus}</p>
          <p className="mt-2 font-semibold">{formatPaise(order.totalInPaise)}</p>
        </div>
      </div>

      {/* Status update */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm font-semibold">Update Status</p>
        <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
      </div>

      {/* Order items */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold">Items ({order.items.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-3 text-left">Product</th>
              <th className="px-5 py-3 text-right">Unit Price</th>
              <th className="px-5 py-3 text-right">Qty</th>
              <th className="px-5 py-3 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item) => {
              const snap = item.productSnapshot as { name?: string; sku?: string };
              return (
                <tr key={item.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium">{snap.name ?? item.product.name}</p>
                    <p className="text-xs font-mono text-gray-400">
                      {item.variant?.sku ?? snap.sku ?? item.product.sku}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-right">{formatPaise(item.unitPriceInPaise)}</td>
                  <td className="px-5 py-3 text-right">{item.quantity}</td>
                  <td className="px-5 py-3 text-right font-medium">{formatPaise(item.lineTotalInPaise)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-gray-200 bg-gray-50">
            <tr>
              <td colSpan={3} className="px-5 py-3 text-right text-sm font-semibold">Total</td>
              <td className="px-5 py-3 text-right font-semibold">{formatPaise(order.totalInPaise)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Credit transactions */}
      {order.creditCharges.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Credit Transactions</h2>
          <div className="space-y-2">
            {order.creditCharges.map((tx) => (
              <div key={tx.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{tx.type} — {tx.status}</span>
                <span className="font-medium">{formatPaise(tx.amountInPaise)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
