import { prisma } from "@/lib/db/prisma";
import type { Shop, Asset } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ShopWithAssets = Shop & {
  logoAsset: Pick<Asset, "id" | "key" | "store"> | null;
  bannerAsset: Pick<Asset, "id" | "key" | "store"> | null;
};

export type SellerStats = {
  productCount: number;
  orderItemsThisMonth: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// getShopForUser
// ─────────────────────────────────────────────────────────────────────────────

export async function getShopForUser(userId: string): Promise<ShopWithAssets | null> {
  return prisma.shop.findFirst({
    where: { ownerId: userId, deletedAt: null },
    include: {
      logoAsset: { select: { id: true, key: true, store: true } },
      bannerAsset: { select: { id: true, key: true, store: true } },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// getShopBySlug
// ─────────────────────────────────────────────────────────────────────────────

export async function getShopBySlug(slug: string): Promise<ShopWithAssets | null> {
  return prisma.shop.findFirst({
    where: { slug, deletedAt: null },
    include: {
      logoAsset: { select: { id: true, key: true, store: true } },
      bannerAsset: { select: { id: true, key: true, store: true } },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// getSellerStats
// ─────────────────────────────────────────────────────────────────────────────

export async function getSellerStats(shopId: string): Promise<SellerStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [productCount, orderItemsThisMonth] = await Promise.all([
    prisma.product.count({ where: { sellerShopId: shopId, deletedAt: null } }),
    prisma.orderItem.count({
      where: { sellerShopId: shopId, order: { placedAt: { gte: startOfMonth } } },
    }),
  ]);

  return { productCount, orderItemsThisMonth };
}
