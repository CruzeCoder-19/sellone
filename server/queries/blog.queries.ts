import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

const postInclude = {
  author: { select: { id: true, name: true } },
  coverAsset: { select: { id: true, key: true, store: true } },
} satisfies Prisma.BlogPostInclude;

export type BlogPostRow = Prisma.BlogPostGetPayload<{ include: typeof postInclude }>;

// ─────────────────────────────────────────────────────────────────────────────
// getPublishedPosts
// ─────────────────────────────────────────────────────────────────────────────

export async function getPublishedPosts(opts: {
  page: number;
  pageSize: number;
}): Promise<{ rows: BlogPostRow[]; total: number }> {
  const { page, pageSize } = opts;
  const skip = (page - 1) * pageSize;
  const now = new Date();

  const where: Prisma.BlogPostWhereInput = {
    publishedAt: { not: null, lte: now },
  };

  const [rows, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      include: postInclude,
      orderBy: { publishedAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.blogPost.count({ where }),
  ]);

  return { rows, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// getPostBySlug
// ─────────────────────────────────────────────────────────────────────────────

export async function getPostBySlug(slug: string): Promise<BlogPostRow | null> {
  return prisma.blogPost.findFirst({
    where: { slug, publishedAt: { not: null, lte: new Date() } },
    include: postInclude,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// getRecentPosts
// ─────────────────────────────────────────────────────────────────────────────

export async function getRecentPosts(limit: number): Promise<BlogPostRow[]> {
  return prisma.blogPost.findMany({
    where: { publishedAt: { not: null, lte: new Date() } },
    include: postInclude,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// getAllPostsAdmin  (includes drafts — admin only)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllPostsAdmin(opts: {
  page: number;
  pageSize: number;
}): Promise<{ rows: BlogPostRow[]; total: number }> {
  const { page, pageSize } = opts;
  const skip = (page - 1) * pageSize;

  const [rows, total] = await Promise.all([
    prisma.blogPost.findMany({
      include: postInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.blogPost.count(),
  ]);

  return { rows, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// getPostByIdAdmin  (for edit page — includes drafts)
// ─────────────────────────────────────────────────────────────────────────────

export async function getPostByIdAdmin(postId: string): Promise<BlogPostRow | null> {
  return prisma.blogPost.findUnique({ where: { id: postId }, include: postInclude });
}

// ─────────────────────────────────────────────────────────────────────────────
// getPublishedPostSlugsForSitemap
// ─────────────────────────────────────────────────────────────────────────────

export async function getPublishedPostSlugsForSitemap(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  const now = new Date();
  return prisma.blogPost.findMany({
    where: { publishedAt: { not: null, lte: now } },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}
