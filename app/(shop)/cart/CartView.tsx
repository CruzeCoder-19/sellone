"use client";

import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getPublicAssetUrl } from "@/lib/blobs/url";
import { formatPaise } from "@/lib/format";
import { getCartAction, updateCartItem, removeCartItem } from "@/server/actions/cart.actions";
import type { CartView as CartViewType } from "@/types/cart";

interface CartViewProps {
  initialData: CartViewType | null;
}

export function CartView({ initialData }: CartViewProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  const { data: cart } = useQuery({
    queryKey: ["cart", userId],
    queryFn: async () => {
      const r = await getCartAction();
      return r.ok ? r.data : null;
    },
    initialData,
    enabled: !!userId,
    staleTime: 30_000,
  });

  const { mutate: updateQty } = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItem({ itemId, quantity }),
    onMutate: async ({ itemId, quantity }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["cart", userId] });
      const prev = queryClient.getQueryData<CartViewType | null>(["cart", userId]);
      queryClient.setQueryData<CartViewType | null>(["cart", userId], (old) => {
        if (!old) return old;
        const items = old.items
          .map((i) => {
            if (i.id !== itemId) return i;
            if (quantity === 0) return null;
            const lineTotal = i.unitPriceInPaise * quantity;
            return { ...i, quantity, lineTotalInPaise: lineTotal };
          })
          .filter(Boolean) as CartViewType["items"];
        return {
          ...old,
          items,
          subtotalInPaise: items.reduce((s, l) => s + l.lineTotalInPaise, 0),
          itemCount: items.reduce((s, l) => s + l.quantity, 0),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["cart", userId], ctx?.prev);
      toast.error("Failed to update quantity");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cart", userId] });
      queryClient.invalidateQueries({ queryKey: ["cart-counts"] });
    },
  });

  const { mutate: removeItem } = useMutation({
    mutationFn: (itemId: string) => removeCartItem({ itemId }),
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return; }
      queryClient.invalidateQueries({ queryKey: ["cart", userId] });
      queryClient.invalidateQueries({ queryKey: ["cart-counts"] });
    },
    onError: () => toast.error("Failed to remove item"),
  });

  if (!cart || cart.items.length === 0) {
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Your cart</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Line items */}
        <div className="lg:col-span-2">
          <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {cart.items.map((item) => {
              const imageSrc = item.primaryImage
                ? getPublicAssetUrl(item.primaryImage)
                : "/placeholder.svg";
              return (
                <div key={item.id} className="flex gap-4 p-4">
                  {/* Image */}
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                    <Image
                      src={imageSrc}
                      alt={item.productName}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col gap-1">
                    <Link
                      href={`/product/${item.productSlug}`}
                      className="text-sm font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {item.productName}
                    </Link>
                    {item.variantName && (
                      <p className="text-xs text-gray-500">{item.variantName}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {formatPaise(item.unitPriceInPaise)} / unit
                    </p>

                    {/* Qty stepper */}
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateQty({
                            itemId: item.id,
                            quantity: Math.max(item.moq, item.quantity - 1),
                          })
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
                          updateQty({
                            itemId: item.id,
                            quantity: Math.min(item.stock, item.quantity + 1),
                          })
                        }
                        disabled={item.quantity >= item.stock}
                        className="flex h-7 w-7 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Line total + remove */}
                  <div className="flex flex-col items-end justify-between">
                    <p className="text-sm font-bold text-gray-900">
                      {formatPaise(item.lineTotalInPaise)}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
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

        {/* Order summary */}
        <div className="h-fit rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Order summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal ({cart.itemCount} items)</span>
              <span className="font-medium text-gray-900">{formatPaise(cart.subtotalInPaise)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
          </div>
          <div className="my-4 border-t border-gray-200" />
          <div className="flex justify-between text-base font-bold text-gray-900">
            <span>Total</span>
            <span>{formatPaise(cart.subtotalInPaise)}</span>
          </div>
          <div className="mt-4">
            <Link
              href="/checkout"
              className="block w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
            >
              Proceed to checkout
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
