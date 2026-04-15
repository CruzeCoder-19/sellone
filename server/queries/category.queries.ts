import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import type { CategoryNode, CategoryBreadcrumb } from "@/types/catalog";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recursively build the CategoryNode tree from a flat list of DB rows.
 * Called once per cache miss; result is memoised by unstable_cache.
 */
function buildTree(
  rows: {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    _count: { products: number };
  }[],
  parentId: string | null = null,
): CategoryNode[] {
  return rows
    .filter((r) => r.parentId === parentId)
    .map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      parentId: r.parentId,
      productCount: r._count.products,
      children: buildTree(rows, r.id),
    }));
}

/**
 * Walk the tree and collect the IDs of `startId` and all its descendants.
 * The start node's own ID is always included so that products directly in
 * the queried category are not missed.
 */
function collectDescendantIds(nodes: CategoryNode[], startId: string): string[] {
  const result: string[] = [];

  function walk(list: CategoryNode[]): boolean {
    for (const node of list) {
      if (node.id === startId) {
        collectAll(node, result);
        return true;
      }
      if (walk(node.children)) return true;
    }
    return false;
  }

  walk(nodes);
  return result;
}

function collectAll(node: CategoryNode, acc: string[]): void {
  acc.push(node.id);
  for (const child of node.children) {
    collectAll(child, acc);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the full category hierarchy as a nested tree.
 * Cached for 1 hour, tag: "categories".
 * Category has no deletedAt — no soft-delete filter needed.
 */
export const getCategoryTree = unstable_cache(
  async (): Promise<CategoryNode[]> => {
    const rows = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        _count: { select: { products: true } },
      },
    });
    return buildTree(rows);
  },
  ["categories"],
  { revalidate: 3600, tags: ["categories"] },
);

/**
 * Returns a category by slug along with:
 *   - breadcrumb: path from root to this category (inclusive)
 *   - descendantIds: IDs of this category AND all its descendants (for product filtering)
 *
 * Not separately cached — uses the already-cached getCategoryTree result, so
 * the recursive walk is fast and double-caching would add complexity without benefit.
 */
export async function getCategoryBySlug(slug: string): Promise<{
  category: { id: string; name: string; slug: string; parentId: string | null };
  breadcrumb: CategoryBreadcrumb[];
  descendantIds: string[];
} | null> {
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, parentId: true },
  });

  if (!category) return null;

  // Build breadcrumb by walking up the parent chain
  const breadcrumb: CategoryBreadcrumb[] = [];
  let current: { id: string; name: string; slug: string; parentId: string | null } | null =
    category;

  while (current) {
    breadcrumb.unshift({ id: current.id, name: current.name, slug: current.slug });
    if (!current.parentId) break;
    current = await prisma.category.findUnique({
      where: { id: current.parentId },
      select: { id: true, name: true, slug: true, parentId: true },
    });
  }

  // Collect descendantIds (including self) using the cached tree
  const tree = await getCategoryTree();
  const descendantIds = collectDescendantIds(tree, category.id);

  return { category, breadcrumb, descendantIds };
}
