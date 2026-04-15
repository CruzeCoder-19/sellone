import type { AssetRef } from "./catalog";

// ─── Guest storage types ──────────────────────────────────────────────────────

export type GuestCartItem = {
  productId: string;
  variantId: string | null;
  quantity: number;
};

export type GuestWishlistItem = {
  productId: string;
  variantId: string | null;
};

export type GuestCompareItem = {
  productId: string;
  variantId: string | null;
};

// ─── Authenticated views ──────────────────────────────────────────────────────

export type CartLineView = {
  id: string;              // CartItem.id
  productId: string;
  productSlug: string;
  productName: string;
  primaryImage: AssetRef | null;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  moq: number;
  /** Effective stock: variant.stock if variantId present, else product.stock */
  stock: number;
  /** Computed from calculateEffectivePrice(base, tiers, quantity) */
  unitPriceInPaise: number;
  /** unitPriceInPaise * quantity */
  lineTotalInPaise: number;
  productStatus: string;
};

export type CartView = {
  id: string;
  items: CartLineView[];
  subtotalInPaise: number;
  /** Sum of quantities across all line items */
  itemCount: number;
};

export type WishlistLineView = {
  id: string;              // WishlistItem.id
  productId: string;
  productSlug: string;
  productName: string;
  primaryImage: AssetRef | null;
  variantId: string | null;
  variantName: string | null;
  basePriceInPaise: number;
  moq: number;
  productStatus: string;
};

export type WishlistView = {
  id: string;
  items: WishlistLineView[];
};

export type CompareLineView = {
  id: string;              // CompareItem.id
  productId: string;
  productSlug: string;
  productName: string;
  primaryImage: AssetRef | null;
  variantId: string | null;
  variantName: string | null;
  basePriceInPaise: number;
  moq: number;
  brand: { name: string; slug: string } | null;
  categories: { id: string; name: string; slug: string }[];
  productStatus: string;
};

export type CompareView = {
  id: string;
  items: CompareLineView[];
};
