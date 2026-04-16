import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db/prisma";
import { getPublicAssetUrl } from "@/lib/blobs/url";
import { formatPaise } from "@/lib/format";
import { TrackOrderForm } from "./TrackOrderForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Track Order — Wolsell" };

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Order received",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  CONFIRMED: "bg-blue-50 text-blue-700",
  PACKED: "bg-blue-50 text-blue-700",
  SHIPPED: "bg-purple-50 text-purple-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
  RETURNED: "bg-gray-50 text-gray-700",
};

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string; email?: string }>;
}) {
  const { orderNumber, email } = await searchParams;

  let order = null;
  let lookupError: string | null = null;

  if (orderNumber && email) {
    order = await prisma.order.findFirst({
      where: {
        orderNumber,
        deletedAt: null,
        customer: { email },
      },
      include: { items: true },
    });
    if (!order) {
      lookupError = "Order not found. Please check the order number and email address.";
    }
  }

  const snapshot = order
    ? (order.shippingAddressSnapshot as {
        label: string;
        line1: string;
        line2?: string | null;
        city: string;
        state: string;
        postalCode: string;
        phone: string;
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Track your order</h1>

      {/* Lookup form */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <TrackOrderForm
          defaultOrderNumber={orderNumber ?? ""}
          defaultEmail={email ?? ""}
        />
      </div>

      {/* Error */}
      {lookupError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {lookupError}
        </div>
      )}

      {/* Order details */}
      {order && snapshot && (
        <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Order
              </p>
              <p className="font-mono font-bold text-gray-900">{order.orderNumber}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                ORDER_STATUS_COLORS[order.status] ?? "bg-gray-50 text-gray-700"
              }`}
            >
              {ORDER_STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Total
              </p>
              <p className="font-bold text-gray-900">{formatPaise(order.totalInPaise)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Payment
              </p>
              <p className="text-gray-700">
                {order.paymentMethod === "WOLSELL_CREDIT" ? "Wolsell Credit" : "Prepaid"}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Shipping to
            </p>
            <p className="text-sm text-gray-700">{snapshot.line1}</p>
            <p className="text-sm text-gray-700">
              {snapshot.city}, {snapshot.state} — {snapshot.postalCode}
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Items
            </p>
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => {
                const snap = item.productSnapshot as {
                  name: string;
                  sku: string;
                  primaryImage: { assetId: string; key: string; store: string } | null;
                };
                const imageSrc = snap.primaryImage
                  ? getPublicAssetUrl(snap.primaryImage)
                  : "/placeholder.svg";
                return (
                  <div key={item.id} className="flex items-center gap-3 py-2">
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                      <Image
                        src={imageSrc}
                        alt={snap.name}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{snap.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} × {formatPaise(item.unitPriceInPaise)}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                      {formatPaise(item.lineTotalInPaise)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/shop"
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              ← Back to shop
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
