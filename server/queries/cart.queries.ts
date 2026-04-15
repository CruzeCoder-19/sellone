import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { calculateEffectivePrice } from "@/lib/format";
import type { CartView, CartLineView, WishlistView, WishlistLineView, CompareView, CompareLineView } from "@/types/cart";

// ─────────────────────────────────────────────────────────────────────────────
// Shared product include for line items
// ─────────────────────────────────────────────────────────────────────────────

const lineProductInclude = {
  images: {
    take: 1,
    orderBy: { sortOrder: "asc" as const },
    include: {
      asset: { select: { id: true, key: true, store: true, contentType: true } },
    },
  },
  tierPrices: {
    select: { minQty: true, priceInPaise: true },
    orderBy: { minQty: "asc" as const },
  },
} satisfies Prisma.ProductInclude;

const lineVariantSelect = {
  select: { id: true, name: true, priceDeltaInPaise: true, stock: true },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// getCart
// ─────────────────────────────────────────────────────────────────────────────

export async function getCart(userId: string): Promise<CartView | null> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: { include: lineProductInclude },
          variant: lineVariantSelect,
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!cart) return null;

  const items: CartLineView[] = cart.items.map((item) => {
    const img = item.product.images[0];
    const stock = item.variant ? item.variant.stock : item.product.stock;
    const unitPriceInPaise = calculateEffectivePrice(
      item.product.basePriceInPaise,
      item.product.tierPrices,
      item.quantity,
    );
    return {
      id: item.id,
      productId: item.productId,
      productSlug: item.product.slug,
      productName: item.product.name,
      primaryImage: img
        ? { assetId: img.asset.id, key: img.asset.key, store: img.asset.store, contentType: img.asset.contentType }
        : null,
      variantId: item.variantId,
      variantName: item.variant?.name ?? null,
      quantity: item.quantity,
      moq: item.product.moq,
      stock,
      unitPriceInPaise,
      lineTotalInPaise: unitPriceInPaise * item.quantity,
      productStatus: item.product.status,
    };
  });

  return {
    id: cart.id,
    items,
    subtotalInPaise: items.reduce((s, l) => s + l.lineTotalInPaise, 0),
    itemCount: items.reduce((s, l) => s + l.quantity, 0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getWishlist
// ─────────────────────────────────────────────────────────────────────────────

export async function getWishlist(userId: string): Promise<WishlistView | null> {
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: {
                take: 1,
                orderBy: { sortOrder: "asc" as const },
                include: { asset: { select: { id: true, key: true, store: true, contentType: true } } },
              },
            },
          },
          variant: lineVariantSelect,
        },
        orderBy: { id: "desc" },
      },
    },
  });

  if (!wishlist) return null;

  const items: WishlistLineView[] = wishlist.items.map((item) => {
    const img = item.product.images[0];
    return {
      id: item.id,
      productId: item.productId,
      productSlug: item.product.slug,
      productName: item.product.name,
      primaryImage: img
        ? { assetId: img.asset.id, key: img.asset.key, store: img.asset.store, contentType: img.asset.contentType }
        : null,
      variantId: item.variantId,
      variantName: item.variant?.name ?? null,
      basePriceInPaise: item.product.basePriceInPaise,
      moq: item.product.moq,
      productStatus: item.product.status,
    };
  });

  return { id: wishlist.id, items };
}

// ─────────────────────────────────────────────────────────────────────────────
// getCompareList
// ─────────────────────────────────────────────────────────────────────────────

export async function getCompareList(userId: string): Promise<CompareView | null> {
  const compareList = await prisma.compareList.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: {
                take: 1,
                orderBy: { sortOrder: "asc" as const },
                include: { asset: { select: { id: true, key: true, store: true, contentType: true } } },
              },
              brand: { select: { name: true, slug: true } },
              categories: {
                take: 3,
                include: { category: { select: { id: true, name: true, slug: true } } },
              },
            },
          },
          variant: lineVariantSelect,
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!compareList) return null;

  const items: CompareLineView[] = compareList.items.map((item) => {
    const img = item.product.images[0];
    return {
      id: item.id,
      productId: item.productId,
      productSlug: item.product.slug,
      productName: item.product.name,
      primaryImage: img
        ? { assetId: img.asset.id, key: img.asset.key, store: img.asset.store, contentType: img.asset.contentType }
        : null,
      variantId: item.variantId,
      variantName: item.variant?.name ?? null,
      basePriceInPaise: item.product.basePriceInPaise,
      moq: item.product.moq,
      brand: item.product.brand,
      categories: item.product.categories.map((c) => ({
        id: c.category.id,
        name: c.category.name,
        slug: c.category.slug,
      })),
      productStatus: item.product.status,
    };
  });

  return { id: compareList.id, items };
}
