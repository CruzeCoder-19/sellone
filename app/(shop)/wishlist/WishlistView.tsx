"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getPublicAssetUrl } from "@/lib/blobs/url";
import { formatPaise } from "@/lib/format";
import { getWishlistAction, removeWishlistItem, moveWishlistToCart } from "@/server/actions/cart.actions";
import type { WishlistView as WishlistViewType } from "@/types/cart";

interface WishlistViewProps {
  initialData: WishlistViewType | null;
}

export function WishlistView({ initialData }: WishlistViewProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const [movingId, setMovingId] = useState<string | null>(null);

  const { data: wishlist } = useQuery({
    queryKey: ["wishlist", userId],
    queryFn: async () => {
      const r = await getWishlistAction();
      return r.ok ? r.data : null;
    },
    initialData,
    enabled: !!userId,
    staleTime: 30_000,
  });

  const { mutate: remove } = useMutation({
    mutationFn: (itemId: string) => removeWishlistItem({ itemId }),
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return; }
      queryClient.invalidateQueries({ queryKey: ["wishlist", userId] });
      queryClient.invalidateQueries({ queryKey: ["cart-counts"] });
    },
    onError: () => toast.error("Failed to remove from wishlist"),
  });

  const { mutate: moveToCart } = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      moveWishlistToCart({ itemId, quantity }),
    onMutate: ({ itemId }) => setMovingId(itemId),
    onSuccess: (result) => {
      setMovingId(null);
      if (!result.ok) { toast.error(result.error); return; }
      queryClient.invalidateQueries({ queryKey: ["wishlist", userId] });
      queryClient.invalidateQueries({ queryKey: ["cart", userId] });
      queryClient.invalidateQueries({ queryKey: ["cart-counts"] });
      toast.success("Moved to cart", {
        action: { label: "View cart", onClick: () => (window.location.href = "/cart") },
      });
    },
    onError: () => { setMovingId(null); toast.error("Failed to move to cart"); },
  });

  if (!wishlist || wishlist.items.length === 0) {
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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Wishlist <span className="text-gray-400">({wishlist.items.length})</span>
      </h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {wishlist.items.map((item) => {
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
                {item.variantName && (
                  <p className="text-xs text-gray-500">{item.variantName}</p>
                )}
                <p className="text-sm font-bold text-gray-900">
                  {formatPaise(item.basePriceInPaise)}
                </p>
                <div className="mt-auto flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1 text-xs"
                    disabled={item.productStatus !== "ACTIVE" || movingId === item.id}
                    onClick={() => moveToCart({ itemId: item.id, quantity: item.moq })}
                  >
                    <ShoppingCart className="h-3 w-3" />
                    {movingId === item.id ? "Moving…" : "Move to cart"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
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
