"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { getPublicAssetUrl } from "@/lib/blobs/url";
import { formatPaise } from "@/lib/format";
import { getGuestWishlistLines } from "@/server/actions/cart.actions";
import { readGuestWishlist, removeGuestWishlistItem } from "@/lib/guest-storage";
import type { GuestWishlistItem } from "@/types/cart";

export function GuestWishlistView() {
  const queryClient = useQueryClient();
  const [guestItems, setGuestItems] = useState<GuestWishlistItem[]>([]);

  useEffect(() => {
    setGuestItems(readGuestWishlist());
    function onStorage() { setGuestItems(readGuestWishlist()); }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const { data: lines = [] } = useQuery({
    queryKey: ["guest-wishlist-lines", guestItems],
    queryFn: () => getGuestWishlistLines({ items: guestItems }),
    enabled: guestItems.length > 0,
    staleTime: 60_000,
  });

  function handleRemove(productId: string, variantId: string | null) {
    removeGuestWishlistItem(productId, variantId);
    const updated = readGuestWishlist();
    setGuestItems(updated);
    queryClient.invalidateQueries({ queryKey: ["guest-wishlist-lines"] });
    window.dispatchEvent(new Event("storage"));
  }

  if (guestItems.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Your wishlist is empty</h1>
        <p className="mb-8 text-gray-500">Save products you love to come back to them later.</p>
        <Link
          href="/shop"
          className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">
        Wishlist <span className="text-gray-400">({lines.length})</span>
      </h1>

      <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        <strong>Sign in to save your wishlist.</strong>{" "}
        <Link href="/login?callbackUrl=/wishlist" className="font-semibold underline hover:text-yellow-900">
          Sign in
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {lines.map((item) => {
          const imageSrc = item.primaryImage
            ? getPublicAssetUrl(item.primaryImage)
            : "/placeholder.svg";
          return (
            <div
              key={item.id}
              className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                <Image src={imageSrc} alt={item.productName} fill sizes="300px" className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <Link
                  href={`/product/${item.productSlug}`}
                  className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-blue-600"
                >
                  {item.productName}
                </Link>
                {item.variantName && <p className="text-xs text-gray-500">{item.variantName}</p>}
                <p className="text-sm font-bold text-gray-900">{formatPaise(item.basePriceInPaise)}</p>
                <div className="mt-auto flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemove(item.productId, item.variantId)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-400 hover:text-red-500"
                    aria-label="Remove from wishlist"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
