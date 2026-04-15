"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { calculateEffectivePrice } from "@/lib/format";
import { getCart, getWishlist, getCompareList } from "@/server/queries/cart.queries";
import type { CartView, WishlistView, CompareView, CartLineView, GuestCartItem, GuestWishlistItem, GuestCompareItem } from "@/types/cart";

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

const MAX_COMPARE = 4;

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper
// ─────────────────────────────────────────────────────────────────────────────

async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Query action wrappers (called by Client Components)
// ─────────────────────────────────────────────────────────────────────────────

export async function getCartAction(): Promise<ActionResult<CartView | null>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };
  const data = await getCart(userId);
  return { ok: true, data };
}

export async function getWishlistAction(): Promise<ActionResult<WishlistView | null>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };
  const data = await getWishlist(userId);
  return { ok: true, data };
}

export async function getCompareAction(): Promise<ActionResult<CompareView | null>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };
  const data = await getCompareList(userId);
  return { ok: true, data };
}

// ─────────────────────────────────────────────────────────────────────────────
// getCounts — single round-trip for header badge numbers
// ─────────────────────────────────────────────────────────────────────────────

export async function getCounts(): Promise<ActionResult<{ cartCount: number; wishlistCount: number; compareCount: number }>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };
  const [cartCount, wishlistCount, compareCount] = await prisma.$transaction([
    prisma.cartItem.count({ where: { cart: { userId } } }),
    prisma.wishlistItem.count({ where: { wishlist: { userId } } }),
    prisma.compareItem.count({ where: { compareList: { userId } } }),
  ]);
  return { ok: true, data: { cartCount, wishlistCount, compareCount } };
}

// ─────────────────────────────────────────────────────────────────────────────
// getGuestCartLines — enriches guest localStorage items without persisting
// ─────────────────────────────────────────────────────────────────────────────

export async function getGuestCartLines({
  items,
}: {
  items: GuestCartItem[];
}): Promise<CartLineView[]> {
  if (items.length === 0) return [];

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, deletedAt: null },
    include: {
      images: {
        take: 1,
        orderBy: { sortOrder: "asc" as const },
        include: { asset: { select: { id: true, key: true, store: true, contentType: true } } },
      },
      tierPrices: { select: { minQty: true, priceInPaise: true }, orderBy: { minQty: "asc" as const } },
      variants: { select: { id: true, name: true, priceDeltaInPaise: true, stock: true } },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  const lines: CartLineView[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product || product.status !== "ACTIVE") continue;

    const variant = item.variantId
      ? product.variants.find((v) => v.id === item.variantId) ?? null
      : null;
    const stock = variant ? variant.stock : product.stock;
    const unitPriceInPaise = calculateEffectivePrice(
      product.basePriceInPaise,
      product.tierPrices,
      item.quantity,
    );
    const img = product.images[0];

    lines.push({
      id: `guest-${item.productId}-${item.variantId ?? "null"}`,
      productId: item.productId,
      productSlug: product.slug,
      productName: product.name,
      primaryImage: img
        ? { assetId: img.asset.id, key: img.asset.key, store: img.asset.store, contentType: img.asset.contentType }
        : null,
      variantId: item.variantId,
      variantName: variant?.name ?? null,
      quantity: item.quantity,
      moq: product.moq,
      stock,
      unitPriceInPaise,
      lineTotalInPaise: unitPriceInPaise * item.quantity,
      productStatus: product.status,
    });
  }

  return lines;
}

export async function getGuestWishlistLines({
  items,
}: {
  items: GuestWishlistItem[];
}): Promise<import("@/types/cart").WishlistLineView[]> {
  if (items.length === 0) return [];

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, deletedAt: null },
    include: {
      images: {
        take: 1,
        orderBy: { sortOrder: "asc" as const },
        include: { asset: { select: { id: true, key: true, store: true, contentType: true } } },
      },
      variants: { select: { id: true, name: true, priceDeltaInPaise: true, stock: true } },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  const lines: import("@/types/cart").WishlistLineView[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) continue;
    const variant = item.variantId
      ? product.variants.find((v) => v.id === item.variantId) ?? null
      : null;
    const img = product.images[0];
    lines.push({
      id: `guest-${item.productId}-${item.variantId ?? "null"}`,
      productId: item.productId,
      productSlug: product.slug,
      productName: product.name,
      primaryImage: img
        ? { assetId: img.asset.id, key: img.asset.key, store: img.asset.store, contentType: img.asset.contentType }
        : null,
      variantId: item.variantId,
      variantName: variant?.name ?? null,
      basePriceInPaise: product.basePriceInPaise,
      moq: product.moq,
      productStatus: product.status,
    });
  }

  return lines;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cart actions
// ─────────────────────────────────────────────────────────────────────────────

export async function addToCart({
  productId,
  variantId,
  quantity,
}: {
  productId: string;
  variantId?: string;
  quantity: number;
}): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Please sign in to add items to cart" };

  const product = await prisma.product.findUnique({
    where: { id: productId, deletedAt: null },
    include: {
      variants: variantId ? { where: { id: variantId } } : false,
      tierPrices: true,
    },
  });

  if (!product) return { ok: false, error: "Product not found" };
  if (product.status !== "ACTIVE") return { ok: false, error: "Product unavailable" };
  if (quantity < product.moq) return { ok: false, error: `Minimum order quantity is ${product.moq}` };

  const effectiveStock = variantId
    ? ((product.variants as { stock: number }[])[0]?.stock ?? 0)
    : product.stock;
  if (quantity > effectiveStock) return { ok: false, error: "Insufficient stock" };

  const cart = await prisma.cart.findUniqueOrThrow({ where: { userId } });

  // NULL-safe upsert: must query first — PostgreSQL UNIQUE treats NULLs as distinct,
  // so (cartId, productId, NULL) can have duplicates if we rely on conflict handling.
  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, variantId: variantId ?? null },
  });

  if (existing) {
    // SET semantics for direct UI calls — caller passes desired final quantity
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity } });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, variantId: variantId ?? null, quantity },
    });
  }

  return { ok: true };
}

export async function updateCartItem({
  itemId,
  quantity,
}: {
  itemId: string;
  quantity: number;
}): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    include: {
      product: true,
      variant: { select: { stock: true } },
    },
  });

  if (!item) return { ok: false, error: "Item not found" };

  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
    return { ok: true };
  }

  if (quantity < item.product.moq) return { ok: false, error: `Minimum order quantity is ${item.product.moq}` };
  const effectiveStock = item.variant ? item.variant.stock : item.product.stock;
  if (quantity > effectiveStock) return { ok: false, error: "Insufficient stock" };

  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  return { ok: true };
}

export async function removeCartItem({ itemId }: { itemId: string }): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
  });
  if (!item) return { ok: false, error: "Item not found" };

  await prisma.cartItem.delete({ where: { id: itemId } });
  return { ok: true };
}

export async function clearCart(): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  await prisma.cartItem.deleteMany({ where: { cart: { userId } } });
  return { ok: true };
}

/**
 * mergeGuestCart uses SUM semantics. addToCart uses SET semantics. Do not conflate.
 *
 * If a product already exists in the server cart, the guest quantity is ADDED to the
 * existing quantity (capped at effective stock). If not present, it is created with
 * the guest quantity.
 */
export async function mergeGuestCart({
  items,
}: {
  items: GuestCartItem[];
}): Promise<ActionResult<{ merged: number; skipped: number }>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };
  if (items.length === 0) return { ok: true, data: { merged: 0, skipped: 0 } };

  const cart = await prisma.cart.findUniqueOrThrow({ where: { userId } });

  let merged = 0;
  let skipped = 0;

  for (const guestItem of items) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: guestItem.productId, deletedAt: null },
        include: {
          variants: guestItem.variantId ? { where: { id: guestItem.variantId } } : false,
        },
      });

      if (!product || product.status !== "ACTIVE") { skipped++; continue; }
      if (guestItem.quantity < product.moq) { skipped++; continue; }

      const effectiveStock = guestItem.variantId
        ? ((product.variants as { stock: number }[])[0]?.stock ?? 0)
        : product.stock;

      const existing = await prisma.cartItem.findFirst({
        where: { cartId: cart.id, productId: guestItem.productId, variantId: guestItem.variantId ?? null },
      });

      if (existing) {
        // SUM: add guest qty to existing, cap at stock
        const newQty = Math.min(existing.quantity + guestItem.quantity, effectiveStock);
        await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
      } else {
        const qty = Math.min(guestItem.quantity, effectiveStock);
        if (qty < product.moq) { skipped++; continue; }
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: guestItem.productId,
            variantId: guestItem.variantId ?? null,
            quantity: qty,
          },
        });
      }
      merged++;
    } catch {
      skipped++;
    }
  }

  return { ok: true, data: { merged, skipped } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Wishlist actions
// ─────────────────────────────────────────────────────────────────────────────

export async function addToWishlist({
  productId,
  variantId,
}: {
  productId: string;
  variantId?: string;
}): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Please sign in to save items" };

  const wishlist = await prisma.wishlist.findUniqueOrThrow({ where: { userId } });

  const existing = await prisma.wishlistItem.findFirst({
    where: { wishlistId: wishlist.id, productId, variantId: variantId ?? null },
  });

  if (!existing) {
    await prisma.wishlistItem.create({
      data: { wishlistId: wishlist.id, productId, variantId: variantId ?? null },
    });
  }

  return { ok: true };
}

export async function removeWishlistItem({ itemId }: { itemId: string }): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const item = await prisma.wishlistItem.findFirst({
    where: { id: itemId, wishlist: { userId } },
  });
  if (!item) return { ok: false, error: "Item not found" };

  await prisma.wishlistItem.delete({ where: { id: itemId } });
  return { ok: true };
}

export async function moveWishlistToCart({
  itemId,
  quantity,
}: {
  itemId: string;
  quantity: number;
}): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const wishlistItem = await prisma.wishlistItem.findFirst({
    where: { id: itemId, wishlist: { userId } },
    include: {
      product: true,
      variant: { select: { stock: true } },
    },
  });
  if (!wishlistItem) return { ok: false, error: "Item not found" };

  const { productId, variantId } = wishlistItem;
  const product = wishlistItem.product;

  if (product.status !== "ACTIVE") return { ok: false, error: "Product unavailable" };
  if (quantity < product.moq) return { ok: false, error: `Minimum order quantity is ${product.moq}` };
  const effectiveStock = wishlistItem.variant ? wishlistItem.variant.stock : product.stock;
  if (quantity > effectiveStock) return { ok: false, error: "Insufficient stock" };

  const cart = await prisma.cart.findUniqueOrThrow({ where: { userId } });

  await prisma.$transaction(async (tx) => {
    const existing = await tx.cartItem.findFirst({
      where: { cartId: cart.id, productId, variantId: variantId ?? null },
    });
    if (existing) {
      await tx.cartItem.update({ where: { id: existing.id }, data: { quantity } });
    } else {
      await tx.cartItem.create({
        data: { cartId: cart.id, productId, variantId: variantId ?? null, quantity },
      });
    }
    await tx.wishlistItem.delete({ where: { id: itemId } });
  });

  return { ok: true };
}

export async function mergeGuestWishlist({
  items,
}: {
  items: GuestWishlistItem[];
}): Promise<ActionResult<{ merged: number; skipped: number }>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };
  if (items.length === 0) return { ok: true, data: { merged: 0, skipped: 0 } };

  const wishlist = await prisma.wishlist.findUniqueOrThrow({ where: { userId } });
  let merged = 0;
  let skipped = 0;

  for (const item of items) {
    try {
      const existing = await prisma.wishlistItem.findFirst({
        where: { wishlistId: wishlist.id, productId: item.productId, variantId: item.variantId ?? null },
      });
      if (!existing) {
        await prisma.wishlistItem.create({
          data: { wishlistId: wishlist.id, productId: item.productId, variantId: item.variantId ?? null },
        });
      }
      merged++;
    } catch {
      skipped++;
    }
  }

  return { ok: true, data: { merged, skipped } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Compare actions
// ─────────────────────────────────────────────────────────────────────────────

export async function addToCompare({
  productId,
  variantId,
}: {
  productId: string;
  variantId?: string;
}): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Please sign in to compare products" };

  const compareList = await prisma.compareList.findUniqueOrThrow({ where: { userId } });

  const count = await prisma.compareItem.count({ where: { compareListId: compareList.id } });
  if (count >= MAX_COMPARE) return { ok: false, error: "Maximum 4 products in compare list" };

  const existing = await prisma.compareItem.findFirst({
    where: { compareListId: compareList.id, productId, variantId: variantId ?? null },
  });
  if (!existing) {
    await prisma.compareItem.create({
      data: { compareListId: compareList.id, productId, variantId: variantId ?? null },
    });
  }

  return { ok: true };
}

export async function removeCompareItem({ itemId }: { itemId: string }): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const item = await prisma.compareItem.findFirst({
    where: { id: itemId, compareList: { userId } },
  });
  if (!item) return { ok: false, error: "Item not found" };

  await prisma.compareItem.delete({ where: { id: itemId } });
  return { ok: true };
}

export async function clearCompare(): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  await prisma.compareItem.deleteMany({ where: { compareList: { userId } } });
  return { ok: true };
}

export async function mergeGuestCompare({
  items,
}: {
  items: GuestCompareItem[];
}): Promise<ActionResult<{ merged: number; skipped: number }>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };
  if (items.length === 0) return { ok: true, data: { merged: 0, skipped: 0 } };

  const compareList = await prisma.compareList.findUniqueOrThrow({ where: { userId } });
  let merged = 0;
  let skipped = 0;

  for (const item of items) {
    try {
      const count = await prisma.compareItem.count({ where: { compareListId: compareList.id } });
      if (count >= MAX_COMPARE) { skipped++; continue; }

      const existing = await prisma.compareItem.findFirst({
        where: { compareListId: compareList.id, productId: item.productId, variantId: item.variantId ?? null },
      });
      if (!existing) {
        await prisma.compareItem.create({
          data: { compareListId: compareList.id, productId: item.productId, variantId: item.variantId ?? null },
        });
      }
      merged++;
    } catch {
      skipped++;
    }
  }

  return { ok: true, data: { merged, skipped } };
}
