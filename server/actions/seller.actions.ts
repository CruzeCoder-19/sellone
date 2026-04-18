"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser, requireRoles } from "@/lib/auth/helpers";
import { getShopForUser } from "@/server/queries/seller.queries";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// Shared validation helpers
// ─────────────────────────────────────────────────────────────────────────────

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// ─────────────────────────────────────────────────────────────────────────────
// applyToSell
// ─────────────────────────────────────────────────────────────────────────────

const applySchema = z.object({
  shopName: z.string().min(2, "Shop name must be at least 2 characters").max(100),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug must be at most 50 characters")
    .regex(SLUG_REGEX, "Slug must be lowercase letters and numbers only, no leading/trailing hyphens"),
  gstin: z.string().regex(GSTIN_REGEX, "Invalid GSTIN format").optional().or(z.literal("")),
  businessAddress: z.string().min(10, "Please enter a full business address").max(500),
  phone: z.string().min(7, "Invalid phone number").max(20),
  email: z.string().email("Invalid email address"),
  description: z.string().max(500).optional(),
});

export async function applyToSell(
  input: z.input<typeof applySchema>,
): Promise<ActionResult<{ shopId: string }>> {
  const user = await requireUser();

  const parsed = applySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  // Guard: user cannot apply if they already have a shop
  const existingShop = await getShopForUser(user.id);
  if (existingShop) {
    return { ok: false, error: "You already have a seller account." };
  }

  try {
    const shop = await prisma.$transaction(async (ctx) => {
      const created = await ctx.shop.create({
        data: {
          ownerId: user.id,
          name: data.shopName,
          slug: data.slug,
          status: "PENDING",
          gstin: data.gstin || undefined,
          businessAddress: data.businessAddress,
          phone: data.phone,
          email: data.email,
          description: data.description || undefined,
        },
      });

      await ctx.userRole.upsert({
        where: { userId_role: { userId: user.id, role: "SELLER" } },
        create: { userId: user.id, role: "SELLER" },
        update: {},
      });

      await ctx.user.update({
        where: { id: user.id },
        data: { rolesUpdatedAt: new Date() },
      });

      return created;
    });

    return { ok: true, data: { shopId: shop.id } };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: false, error: "This slug is already taken. Try a different one." };
    }
    console.error("[applyToSell] error:", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateShopProfile
// ─────────────────────────────────────────────────────────────────────────────

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  gstin: z.string().regex(GSTIN_REGEX, "Invalid GSTIN format").optional().or(z.literal("")),
  businessAddress: z.string().min(10).max(500).optional(),
  phone: z.string().min(7).max(20).optional(),
  email: z.string().email("Invalid email address").optional(),
  logoAssetId: z.string().optional(),
  bannerAssetId: z.string().optional(),
});

export async function updateShopProfile(
  input: z.input<typeof updateSchema>,
): Promise<ActionResult> {
  const user = await requireRoles("SELLER");

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const shop = await getShopForUser(user.id);
  if (!shop) return { ok: false, error: "Shop not found." };

  try {
    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        name: data.name,
        description: data.description !== undefined ? data.description || null : undefined,
        gstin: data.gstin !== undefined ? data.gstin || null : undefined,
        businessAddress: data.businessAddress,
        phone: data.phone,
        email: data.email,
        logoAssetId: data.logoAssetId,
        bannerAssetId: data.bannerAssetId,
      },
    });
    return { ok: true };
  } catch (err) {
    console.error("[updateShopProfile] error:", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
