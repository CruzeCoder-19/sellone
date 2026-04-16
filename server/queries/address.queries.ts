import { prisma } from "@/lib/db/prisma";
import type { Address } from "@prisma/client";

export async function listAddresses(userId: string): Promise<Address[]> {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function getAddress(
  userId: string,
  addressId: string,
): Promise<Address | null> {
  return prisma.address.findFirst({
    where: { id: addressId, userId },
  });
}
