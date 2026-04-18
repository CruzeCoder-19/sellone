"use server";

import { z } from "zod";
import { Prisma, type ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireSellerShop } from "@/lib/seller-scope";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function handleP2002(err: unknown): { ok: false; error: string } | null {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    const target = (err.meta?.target as string[] | undefined) ?? [];
    if (target.includes("slug")) return { ok: false, error: "This slug is already taken." };
    if (target.includes("sku")) return { ok: false, error: "This SKU is already taken." };
    return { ok: false, error: "A unique constraint was violated." };
  }
  return null;
}

/**
 * Asserts that the given product belongs to the seller's shop.
 * Returns the product's id if owned; throws an ActionResult-shaped error otherwise.
 */
async function assertProductOwnership(shopId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, sellerShopId: shopId, deletedAt: null },
    select: { id: true },
  });
  if (!product) throw { ok: false as const, error: "Product not found or access denied." };
  return product;
}

// ─────────────────────────────────────────────────────────────────────────────
// createProduct
// ─────────────────────────────────────────────────────────────────────────────

const createProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  sku: z.string().min(1, "SKU is required").max(100).toUpperCase(),
  slug: z.string().regex(SLUG_REGEX, "Invalid slug format").max(100).optional(),
  description: z.string().max(2000).optional(),
  basePriceInPaise: z.number().int().min(1, "Price must be greater than 0"),
  moq: z.number().int().min(1).default(1),
  stock: z.number().int().min(0).default(0),
  categoryIds: z.array(z.string()).optional(),
  brandId: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "SOLD_OUT", "ARCHIVED"]).default("DRAFT"),
});

export async function createProduct(
  input: z.input<typeof createProductSchema>,
): Promise<ActionResult<{ productId: string }>> {
  try {
    const { shopId } = await requireSellerShop();
    const data = createProductSchema.parse(input);

    const slug = data.slug || toSlug(data.name);

    const product = await prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        slug,
        description: data.description,
        basePriceInPaise: data.basePriceInPaise,
        moq: data.moq,
        stock: data.stock,
        status: data.status as ProductStatus,
        sellerShopId: shopId,
        brandId: data.brandId,
        categories: data.categoryIds?.length
          ? { create: data.categoryIds.map((id) => ({ categoryId: id })) }
          : undefined,
      },
      select: { id: true },
    });

    return { ok: true, data: { productId: product.id } };
  } catch (err) {
    const p2002 = handleP2002(err);
    if (p2002) return p2002;
    if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Validation error" };
    if (typeof err === "object" && err !== null && "ok" in err) return err as { ok: false; error: string };
    console.error("[createProduct]", err);
    return { ok: false, error: "Failed to create product." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateProduct
// ─────────────────────────────────────────────────────────────────────────────

const updateProductSchema = z.object({
  productId: z.string(),
  name: z.string().min(2).max(200).optional(),
  sku: z.string().min(1).max(100).optional(),
  slug: z.string().regex(SLUG_REGEX).max(100).optional(),
  description: z.string().max(2000).optional(),
  basePriceInPaise: z.number().int().min(1).optional(),
  moq: z.number().int().min(1).optional(),
  stock: z.number().int().min(0).optional(),
  categoryIds: z.array(z.string()).optional(),
  brandId: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "SOLD_OUT", "ARCHIVED"]).optional(),
});

export async function updateProduct(
  input: z.input<typeof updateProductSchema>,
): Promise<ActionResult> {
  try {
    const { shopId } = await requireSellerShop();
    const data = updateProductSchema.parse(input);
    const { productId, categoryIds, ...fields } = data;

    await assertProductOwnership(shopId, productId);

    if (categoryIds !== undefined) {
      // Wrap deleteMany + createMany + update in ONE transaction so a failure
      // between operations never leaves the product with zero categories.
      await prisma.$transaction([
        prisma.productCategory.deleteMany({ where: { productId } }),
        prisma.productCategory.createMany({
          data: categoryIds.map((id) => ({ productId, categoryId: id })),
        }),
        prisma.product.update({
          where: { id: productId },
          data: { ...fields, sku: fields.sku?.toUpperCase() },
        }),
      ]);
    } else {
      await prisma.product.update({
        where: { id: productId },
        data: { ...fields, sku: fields.sku?.toUpperCase() },
      });
    }

    return { ok: true };
  } catch (err) {
    const p2002 = handleP2002(err);
    if (p2002) return p2002;
    if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Validation error" };
    if (typeof err === "object" && err !== null && "ok" in err) return err as { ok: false; error: string };
    console.error("[updateProduct]", err);
    return { ok: false, error: "Failed to update product." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteProduct
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteProduct(productId: string): Promise<ActionResult> {
  try {
    const { shopId } = await requireSellerShop();
    await assertProductOwnership(shopId, productId);
    await prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  } catch (err) {
    if (typeof err === "object" && err !== null && "ok" in err) return err as { ok: false; error: string };
    console.error("[deleteProduct]", err);
    return { ok: false, error: "Failed to delete product." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// addProductVariant
// ─────────────────────────────────────────────────────────────────────────────

export async function addProductVariant(input: {
  productId: string;
  name: string;
  sku: string;
  priceDeltaInPaise: number;
  stockQty: number;
}): Promise<ActionResult<{ variantId: string }>> {
  try {
    const { shopId } = await requireSellerShop();
    await assertProductOwnership(shopId, input.productId);

    const variant = await prisma.productVariant.create({
      data: {
        productId: input.productId,
        name: input.name,
        sku: input.sku.toUpperCase(),
        priceDeltaInPaise: input.priceDeltaInPaise,
        stock: input.stockQty,
      },
      select: { id: true },
    });

    return { ok: true, data: { variantId: variant.id } };
  } catch (err) {
    const p2002 = handleP2002(err);
    if (p2002) return p2002;
    if (typeof err === "object" && err !== null && "ok" in err) return err as { ok: false; error: string };
    console.error("[addProductVariant]", err);
    return { ok: false, error: "Failed to add variant." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateProductVariant
// ─────────────────────────────────────────────────────────────────────────────

export async function updateProductVariant(input: {
  variantId: string;
  name?: string;
  priceDeltaInPaise?: number;
  stockQty?: number;
}): Promise<ActionResult> {
  try {
    const { shopId } = await requireSellerShop();

    const variant = await prisma.productVariant.findUnique({
      where: { id: input.variantId },
      select: { productId: true },
    });
    if (!variant) return { ok: false, error: "Variant not found." };
    await assertProductOwnership(shopId, variant.productId);

    await prisma.productVariant.update({
      where: { id: input.variantId },
      data: {
        name: input.name,
        priceDeltaInPaise: input.priceDeltaInPaise,
        stock: input.stockQty,
      },
    });

    return { ok: true };
  } catch (err) {
    if (typeof err === "object" && err !== null && "ok" in err) return err as { ok: false; error: string };
    console.error("[updateProductVariant]", err);
    return { ok: false, error: "Failed to update variant." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteProductVariant
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteProductVariant(variantId: string): Promise<ActionResult> {
  try {
    const { shopId } = await requireSellerShop();

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { productId: true },
    });
    if (!variant) return { ok: false, error: "Variant not found." };
    await assertProductOwnership(shopId, variant.productId);

    await prisma.productVariant.delete({ where: { id: variantId } });
    return { ok: true };
  } catch (err) {
    if (typeof err === "object" && err !== null && "ok" in err) return err as { ok: false; error: string };
    console.error("[deleteProductVariant]", err);
    return { ok: false, error: "Failed to delete variant." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// addPriceTier
// ─────────────────────────────────────────────────────────────────────────────

export async function addPriceTier(input: {
  productId: string;
  minQty: number;
  priceInPaise: number;
}): Promise<ActionResult> {
  try {
    const { shopId } = await requireSellerShop();
    await assertProductOwnership(shopId, input.productId);

    await prisma.tierPrice.create({
      data: {
        productId: input.productId,
        minQty: input.minQty,
        priceInPaise: input.priceInPaise,
      },
    });

    return { ok: true };
  } catch (err) {
    if (typeof err === "object" && err !== null && "ok" in err) return err as { ok: false; error: string };
    console.error("[addPriceTier]", err);
    return { ok: false, error: "Failed to add price tier." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// removePriceTier
// ─────────────────────────────────────────────────────────────────────────────

export async function removePriceTier(tierId: string): Promise<ActionResult> {
  try {
    const { shopId } = await requireSellerShop();

    const tier = await prisma.tierPrice.findUnique({
      where: { id: tierId },
      select: { productId: true },
    });
    if (!tier) return { ok: false, error: "Price tier not found." };
    await assertProductOwnership(shopId, tier.productId);

    await prisma.tierPrice.delete({ where: { id: tierId } });
    return { ok: true };
  } catch (err) {
    if (typeof err === "object" && err !== null && "ok" in err) return err as { ok: false; error: string };
    console.error("[removePriceTier]", err);
    return { ok: false, error: "Failed to remove price tier." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// addProductImages
// ─────────────────────────────────────────────────────────────────────────────

export async function addProductImages(input: {
  productId: string;
  assetIds: string[];
}): Promise<ActionResult> {
  try {
    const { shopId } = await requireSellerShop();
    await assertProductOwnership(shopId, input.productId);

    const maxOrder = await prisma.productImage.aggregate({
      where: { productId: input.productId },
      _max: { sortOrder: true },
    });
    const startOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    await prisma.productImage.createMany({
      data: input.assetIds.map((assetId, i) => ({
        productId: input.productId,
        assetId,
        sortOrder: startOrder + i,
      })),
    });

    return { ok: true };
  } catch (err) {
    if (typeof err === "object" && err !== null && "ok" in err) return err as { ok: false; error: string };
    console.error("[addProductImages]", err);
    return { ok: false, error: "Failed to add images." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// removeProductImage
// ─────────────────────────────────────────────────────────────────────────────

export async function removeProductImage(imageId: string): Promise<ActionResult> {
  try {
    const { shopId } = await requireSellerShop();

    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
      select: { productId: true },
    });
    if (!image) return { ok: false, error: "Image not found." };
    await assertProductOwnership(shopId, image.productId);

    // Hard delete ProductImage only. Do NOT delete the Asset — it may be
    // referenced elsewhere or needed for audit trails.
    await prisma.productImage.delete({ where: { id: imageId } });
    return { ok: true };
  } catch (err) {
    if (typeof err === "object" && err !== null && "ok" in err) return err as { ok: false; error: string };
    console.error("[removeProductImage]", err);
    return { ok: false, error: "Failed to remove image." };
  }
}
