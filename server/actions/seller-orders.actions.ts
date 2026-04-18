"use server";

import { prisma } from "@/lib/db/prisma";
import { requireSellerShop } from "@/lib/seller-scope";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ActionResult = { ok: true } | { ok: false; error: string };

// Valid seller-initiated status transitions
const VALID_TRANSITIONS: Record<string, string> = {
  CONFIRMED: "PACKED",
  PACKED: "SHIPPED",
};

// ─────────────────────────────────────────────────────────────────────────────
// updateOrderStatus
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sellers can advance an order through: CONFIRMED → PACKED → SHIPPED.
 * Cancel, deliver, and return transitions are NOT permitted for sellers.
 *
 * // TODO: multi-seller order status needs per-item tracking.
 * For now, orders are treated as single-seller and the whole Order.status is updated.
 */
export async function updateOrderStatus(input: {
  orderId: string;
  status: "PACKED" | "SHIPPED";
}): Promise<ActionResult> {
  try {
    const { shopId } = await requireSellerShop();

    // Ownership check: order must have at least one item belonging to this seller.
    const order = await prisma.order.findFirst({
      where: {
        id: input.orderId,
        deletedAt: null,
        items: { some: { sellerShopId: shopId } },
      },
      select: { id: true, status: true },
    });

    if (!order) return { ok: false, error: "Order not found or access denied." };

    // Validate transition
    const expectedCurrent = VALID_TRANSITIONS[order.status];
    if (expectedCurrent !== input.status) {
      return {
        ok: false,
        error: `Cannot move order from ${order.status} to ${input.status}.`,
      };
    }

    await prisma.order.update({
      where: { id: input.orderId },
      data: { status: input.status },
    });

    return { ok: true };
  } catch (err) {
    console.error("[updateOrderStatus]", err);
    return { ok: false, error: "Failed to update order status." };
  }
}
