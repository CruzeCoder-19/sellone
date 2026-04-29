import { prisma } from "@/lib/db/prisma";

export type BrandFilterItem = { id: string; name: string; slug: string };

export async function getAllBrandsForFilter(): Promise<BrandFilterItem[]> {
  return prisma.brand.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
}
