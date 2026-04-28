"use server";

import { z } from "zod";
import { Prisma, type OrderStatus, type Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireRoles } from "@/lib/auth/helpers";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function logAction(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  metadata?: Prisma.InputJsonValue,
) {
  await prisma.auditLog.create({ data: { actorId, action, entity, entityId, metadata } });
}

function handleP2002(err: unknown, field = "field"): { ok: false; error: string } | null {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    return { ok: false, error: `This ${field} is already taken.` };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// updateUserRoles
// ─────────────────────────────────────────────────────────────────────────────

export async function updateUserRoles(input: {
  userId: string;
  roles: Role[];
}): Promise<ActionResult> {
  try {
    const actor = await requireRoles("ADMIN");

    // Prevent removing your own ADMIN role
    if (input.userId === actor.id && !input.roles.includes("ADMIN")) {
      return { ok: false, error: "Cannot remove ADMIN role from yourself." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: input.userId } });
      if (input.roles.length > 0) {
        await tx.userRole.createMany({
          data: input.roles.map((role) => ({ userId: input.userId, role })),
        });
      }
      await tx.user.update({
        where: { id: input.userId },
        data: { rolesUpdatedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "ROLE_UPDATE",
          entity: "User",
          entityId: input.userId,
          metadata: { roles: input.roles } as Prisma.InputJsonValue,
        },
      });
    });

    return { ok: true };
  } catch (err) {
    console.error("[updateUserRoles]", err);
    return { ok: false, error: "Failed to update roles." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// softDeleteUser
// ─────────────────────────────────────────────────────────────────────────────

export async function softDeleteUser(userId: string): Promise<ActionResult> {
  try {
    const actor = await requireRoles("ADMIN");
    if (userId === actor.id) {
      return { ok: false, error: "Cannot delete your own account." };
    }
    await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
    await logAction(actor.id, "SOFT_DELETE", "User", userId);
    return { ok: true };
  } catch (err) {
    console.error("[softDeleteUser]", err);
    return { ok: false, error: "Failed to delete user." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateOrderStatus (admin — any valid transition)
// ─────────────────────────────────────────────────────────────────────────────

export async function updateOrderStatus(input: {
  orderId: string;
  status: OrderStatus;
}): Promise<ActionResult> {
  try {
    const actor = await requireRoles("ADMIN");
    const order = await prisma.order.findFirst({
      where: { id: input.orderId, deletedAt: null },
      select: { id: true },
    });
    if (!order) return { ok: false, error: "Order not found." };

    await prisma.order.update({
      where: { id: input.orderId },
      data: { status: input.status },
    });
    await logAction(actor.id, "ORDER_STATUS_UPDATE", "Order", input.orderId, {
      status: input.status,
    });
    return { ok: true };
  } catch (err) {
    console.error("[updateOrderStatus]", err);
    return { ok: false, error: "Failed to update order status." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// approveShop / suspendShop
// ─────────────────────────────────────────────────────────────────────────────

export async function approveShop(shopId: string): Promise<ActionResult> {
  try {
    const actor = await requireRoles("ADMIN");
    await prisma.shop.update({
      where: { id: shopId },
      data: { status: "ACTIVE", verifiedAt: new Date() },
    });
    await logAction(actor.id, "SHOP_APPROVE", "Shop", shopId);
    return { ok: true };
  } catch (err) {
    console.error("[approveShop]", err);
    return { ok: false, error: "Failed to approve shop." };
  }
}

export async function suspendShop(shopId: string): Promise<ActionResult> {
  try {
    const actor = await requireRoles("ADMIN");
    await prisma.shop.update({ where: { id: shopId }, data: { status: "SUSPENDED" } });
    await logAction(actor.id, "SHOP_SUSPEND", "Shop", shopId);
    return { ok: true };
  } catch (err) {
    console.error("[suspendShop]", err);
    return { ok: false, error: "Failed to suspend shop." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Category CRUD
// ─────────────────────────────────────────────────────────────────────────────

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z.string().regex(SLUG_REGEX, "Invalid slug").max(100),
  parentId: z.string().optional(),
});

export async function createCategory(input: z.input<typeof categorySchema>): Promise<ActionResult<{ categoryId: string }>> {
  try {
    await requireRoles("ADMIN");
    const data = categorySchema.parse(input);
    const cat = await prisma.category.create({
      data: { name: data.name, slug: data.slug, parentId: data.parentId || null },
      select: { id: true },
    });
    return { ok: true, data: { categoryId: cat.id } };
  } catch (err) {
    const p2002 = handleP2002(err, "slug");
    if (p2002) return p2002;
    if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Validation error" };
    console.error("[createCategory]", err);
    return { ok: false, error: "Failed to create category." };
  }
}

export async function updateCategory(input: { categoryId: string } & Partial<z.input<typeof categorySchema>>): Promise<ActionResult> {
  try {
    await requireRoles("ADMIN");
    await prisma.category.update({
      where: { id: input.categoryId },
      data: {
        name: input.name,
        slug: input.slug,
        parentId: input.parentId !== undefined ? (input.parentId || null) : undefined,
      },
    });
    return { ok: true };
  } catch (err) {
    const p2002 = handleP2002(err, "slug");
    if (p2002) return p2002;
    console.error("[updateCategory]", err);
    return { ok: false, error: "Failed to update category." };
  }
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  try {
    await requireRoles("ADMIN");

    const [productCount, childCount] = await Promise.all([
      prisma.productCategory.count({ where: { categoryId } }),
      prisma.category.count({ where: { parentId: categoryId } }),
    ]);
    if (productCount > 0) return { ok: false, error: "Category has products — reassign them first." };
    if (childCount > 0) return { ok: false, error: "Category has sub-categories — delete or move them first." };

    await prisma.category.delete({ where: { id: categoryId } });
    return { ok: true };
  } catch (err) {
    console.error("[deleteCategory]", err);
    return { ok: false, error: "Failed to delete category." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function createBrand(input: { name: string; slug: string }): Promise<ActionResult<{ brandId: string }>> {
  try {
    await requireRoles("ADMIN");
    const brand = await prisma.brand.create({
      data: { name: input.name.trim(), slug: input.slug.trim() },
      select: { id: true },
    });
    return { ok: true, data: { brandId: brand.id } };
  } catch (err) {
    const p2002 = handleP2002(err, "slug");
    if (p2002) return p2002;
    console.error("[createBrand]", err);
    return { ok: false, error: "Failed to create brand." };
  }
}

export async function updateBrand(input: { brandId: string; name?: string; slug?: string }): Promise<ActionResult> {
  try {
    await requireRoles("ADMIN");
    await prisma.brand.update({
      where: { id: input.brandId },
      data: { name: input.name, slug: input.slug },
    });
    return { ok: true };
  } catch (err) {
    const p2002 = handleP2002(err, "slug");
    if (p2002) return p2002;
    console.error("[updateBrand]", err);
    return { ok: false, error: "Failed to update brand." };
  }
}

export async function deleteBrand(brandId: string): Promise<ActionResult> {
  try {
    await requireRoles("ADMIN");
    const productCount = await prisma.product.count({ where: { brandId, deletedAt: null } });
    if (productCount > 0) return { ok: false, error: "Brand has products — reassign them first." };
    await prisma.brand.delete({ where: { id: brandId } });
    return { ok: true };
  } catch (err) {
    console.error("[deleteBrand]", err);
    return { ok: false, error: "Failed to delete brand." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Coupon CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function createCoupon(input: {
  code: string;
  discountType: "PERCENT" | "FLAT";
  value: number;
  minOrderInPaise?: number;
  maxDiscountInPaise?: number;
  expiresAt?: string; // ISO date string
  usageLimit?: number;
}): Promise<ActionResult> {
  try {
    await requireRoles("ADMIN");
    await prisma.coupon.create({
      data: {
        code: input.code.toUpperCase().trim(),
        discountType: input.discountType,
        value: input.value,
        minOrderInPaise: input.minOrderInPaise ?? 0,
        maxDiscountInPaise: input.maxDiscountInPaise ?? null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        usageLimit: input.usageLimit ?? null,
      },
    });
    return { ok: true };
  } catch (err) {
    const p2002 = handleP2002(err, "code");
    if (p2002) return p2002;
    console.error("[createCoupon]", err);
    return { ok: false, error: "Failed to create coupon." };
  }
}

export async function updateCoupon(input: {
  couponId: string;
  code?: string;
  discountType?: "PERCENT" | "FLAT";
  value?: number;
  minOrderInPaise?: number;
  maxDiscountInPaise?: number | null;
  expiresAt?: string | null;
  usageLimit?: number | null;
  active?: boolean;
}): Promise<ActionResult> {
  try {
    await requireRoles("ADMIN");
    const { couponId, expiresAt, ...rest } = input;
    await prisma.coupon.update({
      where: { id: couponId },
      data: {
        ...rest,
        ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
      },
    });
    return { ok: true };
  } catch (err) {
    const p2002 = handleP2002(err, "code");
    if (p2002) return p2002;
    console.error("[updateCoupon]", err);
    return { ok: false, error: "Failed to update coupon." };
  }
}

export async function deactivateCoupon(couponId: string): Promise<ActionResult> {
  return updateCoupon({ couponId, active: false });
}

// ─────────────────────────────────────────────────────────────────────────────
// createAchieverEntry
// ─────────────────────────────────────────────────────────────────────────────

export async function createAchieverEntry(input: {
  userId: string;
  period: string;
  metricInPaise: number;
  rank?: number;
}): Promise<ActionResult> {
  try {
    await requireRoles("ADMIN");
    await prisma.achieverEntry.upsert({
      where: { userId_period: { userId: input.userId, period: input.period } },
      create: {
        userId: input.userId,
        period: input.period,
        metricInPaise: input.metricInPaise,
        rank: input.rank ?? null,
      },
      update: {
        metricInPaise: input.metricInPaise,
        rank: input.rank ?? null,
      },
    });
    return { ok: true };
  } catch (err) {
    console.error("[createAchieverEntry]", err);
    return { ok: false, error: "Failed to create achiever entry." };
  }
}
