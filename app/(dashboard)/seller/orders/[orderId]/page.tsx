import { notFound } from "next/navigation";
import { requireRoles } from "@/lib/auth/helpers";
import { getShopForUser } from "@/server/queries/seller.queries";
import { getSellerOrderDetail } from "@/server/queries/seller-orders.queries";
import { updateOrderStatus } from "@/server/actions/seller-orders.actions";
import { formatPaise } from "@/lib/format";
import type { Metadata } from "next";
import type { OrderStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Order Detail — Wolsell Seller" };

const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  CONFIRMED: "bg-blue-50 text-blue-700",
  PACKED: "bg-yellow-50 text-yellow-700",
  SHIPPED: "bg-purple-50 text-purple-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
  RETURNED: "bg-orange-50 text-orange-700",
};

export default async function SellerOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const user = await requireRoles("SELLER");
  const shop = await getShopForUser(user.id);
  if (!shop) notFound();

  const { orderId } = await params;
  const order = await getSellerOrderDetail(shop.id, orderId);
  if (!order) notFound();

  // Items belonging to this seller only
  const sellerItems = order.items.filter((item) => item.sellerShopId === shop.id);
  const sellerTotal = sellerItems.reduce((sum, item) => sum + item.lineTotalInPaise, 0);

  // Parse shipping address snapshot
  const addr = order.shippingAddressSnapshot as {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    name?: string;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{order.orderNumber}</h1>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE[order.status]}`}
            >
              {order.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Placed on{" "}
            {new Date(order.placedAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <a
          href="/seller/orders"
          className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          ← Back to Orders
        </a>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Customer info */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Customer
          </h2>
          <p className="font-medium text-gray-900">{order.customer.name ?? "—"}</p>
          <p className="text-sm text-gray-500">{order.customer.email ?? "—"}</p>
        </div>

        {/* Shipping address */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Shipping Address
          </h2>
          {addr.name && <p className="font-medium text-gray-900">{addr.name}</p>}
          {addr.line1 && <p className="text-sm text-gray-700">{addr.line1}</p>}
          {addr.line2 && <p className="text-sm text-gray-700">{addr.line2}</p>}
          {(addr.city || addr.state || addr.pincode) && (
            <p className="text-sm text-gray-700">
              {[addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")}
            </p>
          )}
          {!addr.line1 && !addr.city && (
            <p className="text-sm text-gray-400">No address on file</p>
          )}
        </div>
      </div>

      {/* Payment info */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Payment Method</p>
            <p className="mt-0.5 font-medium">{order.paymentMethod.replace("_", " ")}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase text-gray-500">Payment Status</p>
            <p className="mt-0.5 font-medium">{order.paymentStatus}</p>
          </div>
        </div>
      </div>

      {/* Order items (this seller's only) */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold">Your Items</h2>
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
            {sellerItems.map((item) => {
              const snap = item.productSnapshot as { name?: string; sku?: string };
              return (
                <tr key={item.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium">{snap.name ?? "—"}</p>
                    {snap.sku && (
                      <p className="text-xs font-mono text-gray-400">{snap.sku}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">{formatPaise(item.unitPriceInPaise)}</td>
                  <td className="px-5 py-3 text-right">{item.quantity}</td>
                  <td className="px-5 py-3 text-right font-medium">
                    {formatPaise(item.lineTotalInPaise)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-gray-200 bg-gray-50">
            <tr>
              <td colSpan={3} className="px-5 py-3 text-right text-sm font-semibold">
                Your Total
              </td>
              <td className="px-5 py-3 text-right text-sm font-semibold">
                {formatPaise(sellerTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Status update actions */}
      {(order.status === "CONFIRMED" || order.status === "PACKED") && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Update Status</h2>
          <div className="flex gap-3">
            {order.status === "CONFIRMED" && (
              <form
                action={async () => {
                  "use server";
                  await updateOrderStatus({ orderId: order.id, status: "PACKED" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100"
                >
                  Mark as Packed
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
                  className="rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
                >
                  Mark as Shipped
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
