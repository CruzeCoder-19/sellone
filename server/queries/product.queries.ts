import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getCategoryBySlug } from "./category.queries";
import type { ProductListItem, ProductDetail, ProductFilters } from "@/types/catalog";

// ─────────────────────────────────────────────────────────────────────────────
// Shared include shape for list queries
// ─────────────────────────────────────────────────────────────────────────────

const listInclude = {
  brand: { select: { name: true, slug: true } },
  images: {
    take: 1,
    orderBy: { sortOrder: "asc" as const },
    include: { asset: { select: { id: true, key: true, store: true } } },
  },
  _count: { select: { tierPrices: true } },
} satisfies Prisma.ProductInclude;

// ─────────────────────────────────────────────────────────────────────────────
// Mappers
// ─────────────────────────────────────────────────────────────────────────────

type ListRow = Prisma.ProductGetPayload<{ include: typeof listInclude }>;

function toListItem(row: ListRow): ProductListItem {
  const img = row.images[0];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    basePriceInPaise: row.basePriceInPaise,
    moq: row.moq,
    status: row.status,
    primaryImage: img
      ? { assetId: img.asset.id, key: img.asset.key, store: img.asset.store }
      : null,
    brand: row.brand ? { name: row.brand.name, slug: row.brand.slug } : null,
    tierPriceCount: row._count.tierPrices,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// listProducts
// ─────────────────────────────────────────────────────────────────────────────

export async function listProducts(filters: ProductFilters): Promise<{
  items: ProductListItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}> {
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 24;
  const sortBy = filters.sortBy ?? "newest";

  // ── Build where ────────────────────────────────────────────────────────────
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    deletedAt: null,
  };

  if (filters.categorySlug) {
    const result = await getCategoryBySlug(filters.categorySlug);
    if (result) {
      where.categories = {
        some: { categoryId: { in: result.descendantIds } },
      };
    } else {
      // Unknown category → return empty
      return { items: [], total: 0, page, perPage, totalPages: 0 };
    }
  }

  if (filters.brandSlug) {
    where.brand = { slug: filters.brandSlug };
  }

  if (filters.inStockOnly) {
    where.stock = { gt: 0 };
  }

  // ── Sort ───────────────────────────────────────────────────────────────────
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sortBy === "price-asc"
      ? { basePriceInPaise: "asc" }
      : sortBy === "price-desc"
        ? { basePriceInPaise: "desc" }
        : sortBy === "name"
          ? { name: "asc" }
          : { createdAt: "desc" };

  // ── Query ──────────────────────────────────────────────────────────────────
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      include: listInclude,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: rows.map(toListItem),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getProductBySlug
// ─────────────────────────────────────────────────────────────────────────────

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const row = await prisma.product.findFirst({
    where: {
      slug,
      deletedAt: null,
      status: { in: ["ACTIVE", "SOLD_OUT"] },
    },
    include: {
      brand: { select: { name: true, slug: true } },
      sellerShop: { select: { id: true, slug: true, name: true } },
      images: {
        orderBy: { sortOrder: "asc" },
        include: {
          asset: { select: { id: true, key: true, store: true, contentType: true } },
        },
      },
      variants: {
        select: { id: true, sku: true, name: true, priceDeltaInPaise: true, stock: true },
      },
      tierPrices: {
        orderBy: { minQty: "asc" },
        select: { minQty: true, priceInPaise: true },
      },
      categories: {
        include: { category: { select: { id: true, name: true, slug: true } } },
      },
      _count: { select: { tierPrices: true } },
    },
  });

  if (!row) return null;

  const img = row.images[0];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sku: row.sku,
    basePriceInPaise: row.basePriceInPaise,
    moq: row.moq,
    stock: row.stock,
    status: row.status,
    primaryImage: img
      ? { assetId: img.asset.id, key: img.asset.key, store: img.asset.store }
      : null,
    brand: row.brand ? { name: row.brand.name, slug: row.brand.slug } : null,
    tierPriceCount: row._count.tierPrices,
    sellerShop: row.sellerShop
      ? { id: row.sellerShop.id, slug: row.sellerShop.slug, name: row.sellerShop.name }
      : null,
    images: row.images.map((i) => ({
      assetId: i.asset.id,
      key: i.asset.key,
      store: i.asset.store,
      contentType: i.asset.contentType,
    })),
    variants: row.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      priceDeltaInPaise: v.priceDeltaInPaise,
      stock: v.stock,
    })),
    tierPrices: row.tierPrices.map((t) => ({
      minQty: t.minQty,
      priceInPaise: t.priceInPaise,
    })),
    categories: row.categories.map((pc) => ({
      id: pc.category.id,
      name: pc.category.name,
      slug: pc.category.slug,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// listFeaturedProducts
// ─────────────────────────────────────────────────────────────────────────────

export const listFeaturedProducts = unstable_cache(
  async (limit = 8): Promise<ProductListItem[]> => {
    const rows = await prisma.product.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: listInclude,
    });
    return rows.map(toListItem);
  },
  ["featured-products"],
  { revalidate: 600, tags: ["featured-products"] },
);

// ─────────────────────────────────────────────────────────────────────────────
// searchProducts
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// listRelatedProducts
// ─────────────────────────────────────────────────────────────────────────────

export async function listRelatedProducts(
  productId: string,
  categoryId: string,
  limit = 4,
): Promise<ProductListItem[]> {
  const rows = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      id: { not: productId },
      categories: { some: { categoryId } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: listInclude,
  });
  return rows.map(toListItem);
}

// ─────────────────────────────────────────────────────────────────────────────
// searchProducts
// ─────────────────────────────────────────────────────────────────────────────

export async function searchProducts(
  query: string,
  limit = 24,
): Promise<ProductListItem[]> {
  const rows = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    take: limit,
    include: listInclude,
  });
  return rows.map(toListItem);
}

// ─────────────────────────────────────────────────────────────────────────────
// getHomepageStats
// ─────────────────────────────────────────────────────────────────────────────

export async function getHomepageStats(): Promise<{
  productCount: number;
  sellerCount: number;
  categoryCount: number;
}> {
  const [productCount, sellerCount, categoryCount] = await Promise.all([
    prisma.product.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.shop.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.category.count(),
  ]);
  return { productCount, sellerCount, categoryCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// getActiveProductSlugsForSitemap
// ─────────────────────────────────────────────────────────────────────────────

export async function getActiveProductSlugsForSitemap(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  return prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}
