"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicAssetUrl } from "@/lib/blobs/url";
import { formatPaise } from "@/lib/format";
import { getGuestCartLines } from "@/server/actions/cart.actions";
import {
  readGuestCart,
  updateGuestCartItem,
  removeGuestCartItem,
} from "@/lib/guest-storage";
import type { GuestCartItem } from "@/types/cart";

export function GuestCartView() {
  const queryClient = useQueryClient();
  const [guestItems, setGuestItems] = useState<GuestCartItem[]>([]);

  // Read from localStorage after hydration
  useEffect(() => {
    setGuestItems(readGuestCart());
    function onStorage() { setGuestItems(readGuestCart()); }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const { data: lines = [] } = useQuery({
    queryKey: ["guest-cart-lines", guestItems],
    queryFn: () => getGuestCartLines({ items: guestItems }),
    enabled: guestItems.length > 0,
    staleTime: 60_000,
  });

  function handleQtyChange(productId: string, variantId: string | null, quantity: number) {
    updateGuestCartItem(productId, variantId, quantity);
    const updated = readGuestCart();
    setGuestItems(updated);
    queryClient.invalidateQueries({ queryKey: ["guest-cart-lines"] });
    window.dispatchEvent(new Event("storage"));
  }

  function handleRemove(productId: string, variantId: string | null) {
    removeGuestCartItem(productId, variantId);
    const updated = readGuestCart();
    setGuestItems(updated);
    queryClient.invalidateQueries({ queryKey: ["guest-cart-lines"] });
    window.dispatchEvent(new Event("storage"));
  }

  if (guestItems.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Your cart is empty</h1>
        <p className="mb-8 text-gray-500">Add some products to get started.</p>
        <Link
          href="/shop"
          className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotalInPaise, 0);
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Your cart</h1>

      {/* Guest info banner */}
      <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        <strong>Sign in to save your cart and check out.</strong>{" "}
        <Link href="/login?callbackUrl=/cart" className="font-semibold underline hover:text-yellow-900">
          Sign in
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {lines.map((item) => {
              const imageSrc = item.primaryImage
                ? getPublicAssetUrl(item.primaryImage)
                : "/placeholder.svg";
              const guestItem = guestItems.find(
                (g) => g.productId === item.productId && g.variantId === item.variantId,
              );
              return (
                <div key={item.id} className="flex gap-4 p-4">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                    <Image src={imageSrc} alt={item.productName} fill sizes="80px" className="object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <Link
                      href={`/product/${item.productSlug}`}
                      className="text-sm font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {item.productName}
                    </Link>
                    {item.variantName && <p className="text-xs text-gray-500">{item.variantName}</p>}
                    <p className="text-xs text-gray-500">{formatPaise(item.unitPriceInPaise)} / unit</p>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleQtyChange(item.productId, item.variantId, Math.max(item.moq, item.quantity - 1))
                        }
                        disabled={item.quantity <= item.moq}
                        className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleQtyChange(item.productId, item.variantId, Math.min(item.stock, item.quantity + 1))
                        }
                        disabled={item.quantity >= item.stock}
                        className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <p className="text-sm font-bold text-gray-900">{formatPaise(item.lineTotalInPaise)}</p>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.productId, item.variantId)}
                      className="text-gray-400 hover:text-red-500"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="h-fit rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Order summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal ({itemCount} items)</span>
              <span className="font-medium text-gray-900">{formatPaise(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
          </div>
          <div className="my-4 border-t border-gray-200" />
          <div className="flex justify-between text-base font-bold text-gray-900">
            <span>Total</span>
            <span>{formatPaise(subtotal)}</span>
          </div>
          <div className="mt-4">
            <Button disabled size="lg" className="w-full" title="Available in next phase">
              Proceed to checkout
            </Button>
            <p className="mt-2 text-center text-xs text-gray-400">
              Checkout available in next release
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
