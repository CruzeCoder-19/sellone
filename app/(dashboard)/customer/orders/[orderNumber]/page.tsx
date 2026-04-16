import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db/prisma";
import { requireRoles } from "@/lib/auth/helpers";
import { getPublicAssetUrl } from "@/lib/blobs/url";
import { formatPaise } from "@/lib/format";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}): Promise<Metadata> {
  const { orderNumber } = await params;
  return { title: `Order ${orderNumber} — Wolsell` };
}

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

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const user = await requireRoles("CUSTOMER");

  const order = await prisma.order.findFirst({
    where: { orderNumber, customerId: user.id, deletedAt: null },
    include: { items: true },
  });
  if (!order) notFound();

  const snapshot = order.shippingAddressSnapshot as {
    label: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/customer/orders"
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          ← My Orders
        </Link>
      </div>

      <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Order number
            </p>
            <p className="font-mono text-lg font-bold text-gray-900">
              {order.orderNumber}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Placed{" "}
              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              STATUS_COLORS[order.status] ?? "bg-gray-50 text-gray-700"
            }`}
          >
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>

        {/* Totals + payment */}
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Order total
            </p>
            <p className="font-bold text-gray-900">
              {formatPaise(order.totalInPaise)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Payment
            </p>
            <p className="text-gray-700">
              {order.paymentMethod === "WOLSELL_CREDIT"
                ? "Wolsell Credit"
                : "Prepaid"}
            </p>
          </div>
        </div>

        {/* Shipping address */}
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Shipping to
          </p>
          <p className="text-sm font-semibold text-gray-900">{snapshot.label}</p>
          <p className="text-sm text-gray-600">{snapshot.line1}</p>
          {snapshot.line2 && (
            <p className="text-sm text-gray-600">{snapshot.line2}</p>
          )}
          <p className="text-sm text-gray-600">
            {snapshot.city}, {snapshot.state} — {snapshot.postalCode}
          </p>
          <p className="text-sm text-gray-600">{snapshot.phone}</p>
        </div>

        {/* Items */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Items
          </p>
          <div className="divide-y divide-gray-100">
            {order.items.map((item) => {
              const snap = item.productSnapshot as {
                name: string;
                sku: string;
                primaryImage: {
                  assetId: string;
                  key: string;
                  store: string;
                } | null;
              };
              const imageSrc = snap.primaryImage
                ? getPublicAssetUrl(snap.primaryImage)
                : "/placeholder.svg";
              return (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                    <Image
                      src={imageSrc}
                      alt={snap.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {snap.name}
                    </p>
                    <p className="text-xs text-gray-500">SKU: {snap.sku}</p>
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
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/track-order?orderNumber=${order.orderNumber}&email=`}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Track order
        </Link>
        <Link
          href="/shop"
          className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
        >
          Back to shop
        </Link>
      </div>
    </div>
  );
}
