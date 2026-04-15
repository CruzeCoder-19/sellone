"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { getPublicAssetUrl } from "@/lib/blobs/url";
import { formatPaise } from "@/lib/format";
import { getGuestCartLines } from "@/server/actions/cart.actions";
import { readGuestCompare, removeGuestCompareItem, clearGuestCompare } from "@/lib/guest-storage";
import type { GuestCompareItem } from "@/types/cart";

export function GuestCompareView() {
  const queryClient = useQueryClient();
  const [guestItems, setGuestItems] = useState<GuestCompareItem[]>([]);

  useEffect(() => {
    setGuestItems(readGuestCompare());
    function onStorage() { setGuestItems(readGuestCompare()); }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Re-use getGuestCartLines to get product details (only fields we need are a subset)
  const { data: lines = [] } = useQuery({
    queryKey: ["guest-compare-lines", guestItems],
    queryFn: () =>
      getGuestCartLines({
        items: guestItems.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: 1 })),
      }),
    enabled: guestItems.length > 0,
    staleTime: 60_000,
  });

  function handleRemove(productId: string, variantId: string | null) {
    removeGuestCompareItem(productId, variantId);
    setGuestItems(readGuestCompare());
    queryClient.invalidateQueries({ queryKey: ["guest-compare-lines"] });
    window.dispatchEvent(new Event("storage"));
  }

  function handleClearAll() {
    clearGuestCompare();
    setGuestItems([]);
    queryClient.invalidateQueries({ queryKey: ["guest-compare-lines"] });
    window.dispatchEvent(new Event("storage"));
  }

  if (guestItems.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Nothing to compare yet</h1>
        <p className="mb-8 text-gray-500">Add products to compare them side by side.</p>
        <Link
          href="/shop"
          className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Compare <span className="text-gray-400">({lines.length})</span>
        </h1>
        <button
          type="button"
          onClick={handleClearAll}
          className="text-sm text-gray-500 hover:text-red-600 underline"
        >
          Clear all
        </button>
      </div>

      <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        <strong>Sign in to save your compare list.</strong>{" "}
        <Link href="/login?callbackUrl=/compare" className="font-semibold underline hover:text-yellow-900">
          Sign in
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-32 border-b border-gray-200 pb-3" />
              {lines.map((item) => (
                <th key={item.id} className="border-b border-gray-200 pb-3 px-3 text-left align-bottom">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/product/${item.productSlug}`}
                      className="line-clamp-2 font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {item.productName}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.productId, item.variantId)}
                      className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-red-500"
                      aria-label={`Remove ${item.productName}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="py-3 pr-3 text-xs font-medium text-gray-500">Image</td>
              {lines.map((item) => {
                const src = item.primaryImage
                  ? getPublicAssetUrl(item.primaryImage)
                  : "/placeholder.svg";
                return (
                  <td key={item.id} className="px-3 py-3">
                    <div className="relative h-24 w-24 overflow-hidden rounded-md bg-gray-100">
                      <Image src={src} alt={item.productName} fill sizes="96px" className="object-cover" />
                    </div>
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-3 pr-3 text-xs font-medium text-gray-500">Price</td>
              {lines.map((item) => (
                <td key={item.id} className="px-3 py-3 font-semibold text-gray-900">
                  {formatPaise(item.unitPriceInPaise)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 pr-3 text-xs font-medium text-gray-500">MOQ</td>
              {lines.map((item) => (
                <td key={item.id} className="px-3 py-3 text-gray-700">{item.moq} units</td>
              ))}
            </tr>
            <tr>
              <td className="py-3 pr-3 text-xs font-medium text-gray-500">Status</td>
              {lines.map((item) => (
                <td key={item.id} className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.productStatus === "ACTIVE"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {item.productStatus === "ACTIVE" ? "In stock" : "Unavailable"}
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
