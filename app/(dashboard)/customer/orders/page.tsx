import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireRoles } from "@/lib/auth/helpers";
import { formatPaise } from "@/lib/format";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Orders — Wolsell" };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Order received",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  CONFIRMED: "bg-blue-50 text-blue-700",
  PACKED: "bg-blue-50 text-blue-700",
  SHIPPED: "bg-purple-50 text-purple-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
  RETURNED: "bg-gray-50 text-gray-700",
};

export default async function CustomerOrdersPage() {
  const user = await requireRoles("CUSTOMER");

  const orders = await prisma.order.findMany({
    where: { customerId: user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalInPaise: true,
      createdAt: true,
      paymentMethod: true,
      items: { select: { quantity: true } },
    },
  });

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">No orders yet</h1>
        <p className="mb-8 text-gray-500">
          When you place an order, it will appear here.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Orders</h1>
      <div className="space-y-3">
        {orders.map((order) => {
          const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
          return (
            <div
              key={order.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-bold text-gray-900">
                  {order.orderNumber}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {" · "}
                  {itemCount} item{itemCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-bold text-gray-900">
                  {formatPaise(order.totalInPaise)}
                </p>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    STATUS_COLORS[order.status] ?? "bg-gray-50 text-gray-700"
                  }`}
                >
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
                <Link
                  href={`/customer/orders/${order.orderNumber}`}
                  className="whitespace-nowrap text-xs font-semibold text-blue-600 hover:underline"
                >
                  View →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
