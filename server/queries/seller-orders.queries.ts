import { Prisma, type OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

const orderListInclude = (shopId: string) =>
  ({
    customer: { select: { id: true, name: true, email: true } },
    items: {
      where: { sellerShopId: shopId },
    },
  }) satisfies Prisma.OrderInclude;

export type SellerOrderRow = Prisma.OrderGetPayload<{
  include: ReturnType<typeof orderListInclude>;
}>;

export type GetSellerOrdersOpts = {
  page: number;
  pageSize: number;
  status?: OrderStatus;
};

// ─────────────────────────────────────────────────────────────────────────────
// getSellerOrders
// ─────────────────────────────────────────────────────────────────────────────

export async function getSellerOrders(
  shopId: string,
  opts: GetSellerOrdersOpts,
): Promise<{ rows: SellerOrderRow[]; total: number }> {
  const { page, pageSize, status } = opts;
  const skip = (page - 1) * pageSize;

  const where: Prisma.OrderWhereInput = {
    deletedAt: null,
    items: { some: { sellerShopId: shopId } },
    ...(status ? { status } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderListInclude(shopId),
      orderBy: { placedAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return { rows, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// getSellerOrderDetail
// ─────────────────────────────────────────────────────────────────────────────

export type SellerOrderDetail = Prisma.OrderGetPayload<{
  include: {
    customer: { select: { id: true; name: true; email: true } };
    items: true; // all items — component marks which belong to this seller
  };
}> & { shopId: string };

export async function getSellerOrderDetail(
  shopId: string,
  orderId: string,
): Promise<SellerOrderDetail | null> {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      deletedAt: null,
      items: { some: { sellerShopId: shopId } },
    },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      items: true,
    },
  });

  if (!order) return null;
  return { ...order, shopId };
}
