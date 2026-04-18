import { requireUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db/prisma";

/**
 * Returns the authenticated seller's userId and shopId.
 * Use this at the top of every seller server action to scope all DB queries.
 * Uses findFirst (not findUnique) so deletedAt: null can be safely filtered.
 *
 * NOTE: This file is in lib/ so Prisma imports are allowed.
 * Do NOT import this from middleware.ts or auth.config.ts.
 */
export async function requireSellerShop(): Promise<{ userId: string; shopId: string }> {
  const user = await requireUser();
  const shop = await prisma.shop.findFirst({
    where: { ownerId: user.id, deletedAt: null },
    select: { id: true },
  });
  if (!shop) throw new Error("No seller shop found");
  return { userId: user.id, shopId: shop.id };
}
