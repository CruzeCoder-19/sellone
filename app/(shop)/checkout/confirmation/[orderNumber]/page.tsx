import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
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

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const order = await prisma.order.findFirst({
    where: { orderNumber, customerId: session.user.id, deletedAt: null },
    include: {
      items: true,
    },
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
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      {/* Success header */}
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Order placed successfully!</h1>
        <p className="mt-2 text-gray-500">
          Thank you for your order. We&apos;ve received it and will process it shortly.
        </p>
      </div>

      {/* Order details card */}
      <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Order number
            </p>
            <p className="font-mono text-lg font-bold text-gray-900">{order.orderNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Order total
            </p>
            <p className="text-lg font-bold text-gray-900">
              {formatPaise(order.totalInPaise)}
            </p>
          </div>
        </div>

        {/* Payment method */}
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Payment
          </p>
          <p className="text-sm text-gray-700">
            {order.paymentMethod === "WOLSELL_CREDIT" ? "Wolsell Credit" : "Prepaid"}
          </p>
        </div>

        {/* Shipping address */}
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Shipping to
          </p>
          <p className="text-sm font-semibold text-gray-900">{snapshot.label}</p>
          <p className="text-sm text-gray-600">{snapshot.line1}</p>
          {snapshot.line2 && <p className="text-sm text-gray-600">{snapshot.line2}</p>}
          <p className="text-sm text-gray-600">
            {snapshot.city}, {snapshot.state} — {snapshot.postalCode}
          </p>
          <p className="text-sm text-gray-600">{snapshot.phone}</p>
        </div>

        {/* Line items */}
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
                    <p className="text-sm font-semibold text-gray-900">{snap.name}</p>
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

      {/* Action links */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/track-order?orderNumber=${order.orderNumber}&email=`}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Track order
        </Link>
        <Link
          href="/customer/orders"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          My orders
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
