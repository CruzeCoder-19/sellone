import { Prisma, type ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Shared include shape
// ─────────────────────────────────────────────────────────────────────────────

const productDetailInclude = {
  variants: { orderBy: { name: "asc" as const } },
  tierPrices: { orderBy: { minQty: "asc" as const } },
  images: {
    orderBy: { sortOrder: "asc" as const },
    include: { asset: { select: { id: true, key: true, store: true } } },
  },
  brand: { select: { id: true, name: true } },
  categories: { include: { category: { select: { id: true, name: true } } } },
} satisfies Prisma.ProductInclude;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SellerProductRow = Prisma.ProductGetPayload<{
  include: typeof productDetailInclude;
}>;

export type GetSellerProductsOpts = {
  page: number;
  pageSize: number;
  status?: ProductStatus;
};

// ─────────────────────────────────────────────────────────────────────────────
// getSellerProducts
// ─────────────────────────────────────────────────────────────────────────────

export async function getSellerProducts(
  shopId: string,
  opts: GetSellerProductsOpts,
): Promise<{ rows: SellerProductRow[]; total: number }> {
  const { page, pageSize, status } = opts;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ProductWhereInput = {
    sellerShopId: shopId,
    deletedAt: null,
    ...(status ? { status } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productDetailInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return { rows, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// getSellerProduct
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a single product for editing.
 * Returns null if the product doesn't exist, is soft-deleted, or belongs to a different shop.
 */
export async function getSellerProduct(
  shopId: string,
  productId: string,
): Promise<SellerProductRow | null> {
  return prisma.product.findFirst({
    where: { id: productId, sellerShopId: shopId, deletedAt: null },
    include: productDetailInclude,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// getSellerCategories / getSellerBrands  (flat lists for form selects)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllCategoriesFlat(): Promise<
  { id: string; name: string; parentId: string | null }[]
> {
  return prisma.category.findMany({
    select: { id: true, name: true, parentId: true },
    orderBy: { name: "asc" },
  });
}

export async function getAllBrandsFlat(): Promise<{ id: string; name: string }[]> {
  return prisma.brand.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
