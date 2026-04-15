"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Heart, User } from "lucide-react";
import { getCounts } from "@/server/actions/cart.actions";
import { readGuestCart, readGuestWishlist } from "@/lib/guest-storage";

export function HeaderIcons() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // ── Authenticated counts ───────────────────────────────────────────────────
  const { data: serverCounts } = useQuery({
    queryKey: ["cart-counts", userId],
    queryFn: async () => {
      const r = await getCounts();
      return r.ok ? r.data : null;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  // ── Guest counts from localStorage ────────────────────────────────────────
  const [guestCounts, setGuestCounts] = useState({ cartCount: 0, wishlistCount: 0 });
  useEffect(() => {
    if (userId) return;

    function refresh() {
      setGuestCounts({
        cartCount: readGuestCart().reduce((s, i) => s + i.quantity, 0),
        wishlistCount: readGuestWishlist().length,
      });
    }

    refresh();
    // "storage" fires when another tab writes localStorage.
    // AddToCartButton / AddToWishlistButton also dispatch new Event("storage")
    // manually after writing, because native storage events don't fire in the
    // same tab that performed the write.
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [userId]);

  const cartCount = userId ? (serverCounts?.cartCount ?? 0) : guestCounts.cartCount;
  const wishlistCount = userId
    ? (serverCounts?.wishlistCount ?? 0)
    : guestCounts.wishlistCount;

  return (
    <div className="flex items-center gap-3">
      {/* Wishlist */}
      <Link
        href="/wishlist"
        aria-label={`Wishlist${wishlistCount > 0 ? ` (${wishlistCount})` : ""}`}
        className="relative text-gray-500 hover:text-gray-900"
      >
        <Heart className="h-5 w-5" />
        {wishlistCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white">
            {wishlistCount > 99 ? "99+" : wishlistCount}
          </span>
        )}
      </Link>

      {/* Cart */}
      <Link
        href="/cart"
        aria-label={`Cart${cartCount > 0 ? ` (${cartCount})` : ""}`}
        className="relative text-gray-500 hover:text-gray-900"
      >
        <ShoppingCart className="h-5 w-5" />
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white">
          {cartCount > 99 ? "99+" : cartCount}
        </span>
      </Link>

      {/* Login / Account */}
      {userId ? (
        <Link
          href="/customer"
          className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <User className="h-4 w-4" />
          Account
        </Link>
      ) : (
        <Link
          href="/login"
          className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <User className="h-4 w-4" />
          Login
        </Link>
      )}
    </div>
  );
}
