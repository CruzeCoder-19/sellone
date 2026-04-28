import { Prisma, type OrderStatus, type ShopStatus, type Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AdminUserRow = Prisma.UserGetPayload<{
  include: { userRoles: true };
}>;

export type AdminOrderRow = Prisma.OrderGetPayload<{
  include: {
    customer: { select: { id: true; name: true; email: true } };
    _count: { select: { items: true } };
  };
}>;

export type AdminShopRow = Prisma.ShopGetPayload<{
  include: { owner: { select: { id: true; name: true; email: true } } };
}>;

export type AuditLogRow = Prisma.AuditLogGetPayload<{
  include: { actor: { select: { id: true; name: true; email: true } } };
}>;

export type AdminCategoryRow = Prisma.CategoryGetPayload<{
  include: {
    parent: { select: { id: true; name: true } };
    _count: { select: { products: true } };
  };
}>;

export type AdminStats = {
  totalUsers: number;
  totalOrders: number;
  totalProducts: number;
  totalRevenueInPaise: number;
  pendingShops: number;
  pendingCreditApps: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// getAdminStats
// ─────────────────────────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  const [
    totalUsers,
    totalOrders,
    totalProducts,
    revenueResult,
    pendingShops,
    pendingCreditApps,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.order.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.order.aggregate({
      where: { status: "DELIVERED", deletedAt: null },
      _sum: { totalInPaise: true },
    }),
    prisma.shop.count({ where: { status: "PENDING", deletedAt: null } }),
    prisma.creditApplication.count({ where: { status: "PENDING" } }),
  ]);

  return {
    totalUsers,
    totalOrders,
    totalProducts,
    totalRevenueInPaise: revenueResult._sum.totalInPaise ?? 0,
    pendingShops,
    pendingCreditApps,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getUsers
// ─────────────────────────────────────────────────────────────────────────────

export async function getUsers(opts: {
  page: number;
  pageSize: number;
  search?: string;
  roleFilter?: Role;
}): Promise<{ rows: AdminUserRow[]; total: number }> {
  const { page, pageSize, search, roleFilter } = opts;
  const skip = (page - 1) * pageSize;

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(roleFilter ? { userRoles: { some: { role: roleFilter } } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { userRoles: true },
      orderBy: { id: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { rows, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// getOrders
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrders(opts: {
  page: number;
  pageSize: number;
  statusFilter?: OrderStatus;
  search?: string;
}): Promise<{ rows: AdminOrderRow[]; total: number }> {
  const { page, pageSize, statusFilter, search } = opts;
  const skip = (page - 1) * pageSize;

  const where: Prisma.OrderWhereInput = {
    deletedAt: null,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(search ? { orderNumber: { contains: search, mode: "insensitive" } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        _count: { select: { items: true } },
      },
      orderBy: { placedAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return { rows, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// getOrderDetail
// ─────────────────────────────────────────────────────────────────────────────

export async function getOrderDetail(orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, deletedAt: null },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          variant: { select: { id: true, name: true, sku: true } },
        },
      },
      creditCharges: {
        select: {
          id: true,
          type: true,
          amountInPaise: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// getShops
// ─────────────────────────────────────────────────────────────────────────────

export async function getShops(opts: {
  page: number;
  pageSize: number;
  statusFilter?: ShopStatus;
}): Promise<{ rows: AdminShopRow[]; total: number }> {
  const { page, pageSize, statusFilter } = opts;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ShopWhereInput = {
    deletedAt: null,
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.shop.findMany({
      where,
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.shop.count({ where }),
  ]);

  return { rows, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// getCategories / getBrands
// ─────────────────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<AdminCategoryRow[]> {
  return prisma.category.findMany({
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { products: true } },
    },
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
  });
}

export async function getBrands() {
  return prisma.brand.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// getCoupons
// ─────────────────────────────────────────────────────────────────────────────

export async function getCoupons(opts: { page: number; pageSize: number }) {
  const { page, pageSize } = opts;
  const skip = (page - 1) * pageSize;

  const [rows, total] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, skip, take: pageSize }),
    prisma.coupon.count(),
  ]);

  return { rows, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// getAuditLogs
// ─────────────────────────────────────────────────────────────────────────────

export async function getAuditLogs(opts: {
  page: number;
  pageSize: number;
  entityFilter?: string;
  actorSearch?: string;
}): Promise<{ rows: AuditLogRow[]; total: number }> {
  const { page, pageSize, entityFilter, actorSearch } = opts;
  const skip = (page - 1) * pageSize;

  const where: Prisma.AuditLogWhereInput = {
    ...(entityFilter ? { entity: entityFilter } : {}),
    ...(actorSearch
      ? {
          actor: {
            OR: [
              { name: { contains: actorSearch, mode: "insensitive" } },
              { email: { contains: actorSearch, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { rows, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// getSalesUsers  (for AchieverEntry dialog)
// ─────────────────────────────────────────────────────────────────────────────

export async function getSalesUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null, userRoles: { some: { role: "SALES" } } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}
