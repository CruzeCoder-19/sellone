"use client";

import type { GuestCartItem, GuestWishlistItem, GuestCompareItem } from "@/types/cart";

const GUEST_CART_KEY = "wolsell:guest-cart";
const GUEST_WISHLIST_KEY = "wolsell:guest-wishlist";
const GUEST_COMPARE_KEY = "wolsell:guest-compare";

const MAX_COMPARE = 4;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeRead<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function safeWrite<T>(key: string, items: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // quota exceeded — silently ignore
  }
}

function sameItem(a: { productId: string; variantId: string | null }, b: { productId: string; variantId: string | null }): boolean {
  return a.productId === b.productId && a.variantId === b.variantId;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export function readGuestCart(): GuestCartItem[] {
  return safeRead<GuestCartItem>(GUEST_CART_KEY);
}

export function writeGuestCart(items: GuestCartItem[]): void {
  safeWrite(GUEST_CART_KEY, items);
}

export function addGuestCartItem({ productId, variantId, quantity }: GuestCartItem): void {
  const items = readGuestCart();
  const idx = items.findIndex((i) => sameItem(i, { productId, variantId }));
  if (idx >= 0) {
    items[idx].quantity = quantity; // SET semantics for direct UI calls
  } else {
    items.push({ productId, variantId, quantity });
  }
  writeGuestCart(items);
}

export function removeGuestCartItem(productId: string, variantId: string | null): void {
  writeGuestCart(readGuestCart().filter((i) => !sameItem(i, { productId, variantId })));
}

export function updateGuestCartItem(productId: string, variantId: string | null, quantity: number): void {
  if (quantity <= 0) {
    removeGuestCartItem(productId, variantId);
    return;
  }
  const items = readGuestCart();
  const idx = items.findIndex((i) => sameItem(i, { productId, variantId }));
  if (idx >= 0) items[idx].quantity = quantity;
  writeGuestCart(items);
}

export function clearGuestCart(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_CART_KEY);
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export function readGuestWishlist(): GuestWishlistItem[] {
  return safeRead<GuestWishlistItem>(GUEST_WISHLIST_KEY);
}

export function writeGuestWishlist(items: GuestWishlistItem[]): void {
  safeWrite(GUEST_WISHLIST_KEY, items);
}

export function addGuestWishlistItem({ productId, variantId }: GuestWishlistItem): void {
  const items = readGuestWishlist();
  if (!items.some((i) => sameItem(i, { productId, variantId }))) {
    items.push({ productId, variantId });
    writeGuestWishlist(items);
  }
}

export function removeGuestWishlistItem(productId: string, variantId: string | null): void {
  writeGuestWishlist(readGuestWishlist().filter((i) => !sameItem(i, { productId, variantId })));
}

export function clearGuestWishlist(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_WISHLIST_KEY);
}

// ─── Compare ──────────────────────────────────────────────────────────────────

export function readGuestCompare(): GuestCompareItem[] {
  return safeRead<GuestCompareItem>(GUEST_COMPARE_KEY);
}

export function writeGuestCompare(items: GuestCompareItem[]): void {
  safeWrite(GUEST_COMPARE_KEY, items);
}

/**
 * Returns true if added, false if already at MAX_COMPARE (4).
 */
export function addGuestCompareItem({ productId, variantId }: GuestCompareItem): boolean {
  const items = readGuestCompare();
  if (items.some((i) => sameItem(i, { productId, variantId }))) return true; // already in list
  if (items.length >= MAX_COMPARE) return false;
  items.push({ productId, variantId });
  writeGuestCompare(items);
  return true;
}

export function removeGuestCompareItem(productId: string, variantId: string | null): void {
  writeGuestCompare(readGuestCompare().filter((i) => !sameItem(i, { productId, variantId })));
}

export function clearGuestCompare(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_COMPARE_KEY);
}
