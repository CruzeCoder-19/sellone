"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireRoles } from "@/lib/auth/helpers";

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function handleP2002(err: unknown): { ok: false; error: string } | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return { ok: false, error: "This slug is already taken." };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// createBlogPost
// ─────────────────────────────────────────────────────────────────────────────

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  slug: z.string().regex(SLUG_REGEX).max(100).optional(),
  excerpt: z.string().max(500).optional(),
  contentMdx: z.string().min(1, "Content is required"),
  coverAssetId: z.string().optional(),
  publishedAt: z.string().optional(), // ISO date string or empty
});

export async function createBlogPost(
  input: z.input<typeof createSchema>,
): Promise<ActionResult<{ postId: string }>> {
  try {
    const user = await requireRoles("ADMIN");
    const data = createSchema.parse(input);

    const slug = data.slug || toSlug(data.title);
    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt || null,
        contentMdx: data.contentMdx,
        coverAssetId: data.coverAssetId || null,
        authorId: user.id,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      },
      select: { id: true },
    });

    return { ok: true, data: { postId: post.id } };
  } catch (err) {
    const p2002 = handleP2002(err);
    if (p2002) return p2002;
    if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Validation error" };
    console.error("[createBlogPost]", err);
    return { ok: false, error: "Failed to create post." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateBlogPost
// ─────────────────────────────────────────────────────────────────────────────

export async function updateBlogPost(input: {
  postId: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  contentMdx?: string;
  coverAssetId?: string | null;
  publishedAt?: string | null; // ISO string or null (draft)
}): Promise<ActionResult> {
  try {
    await requireRoles("ADMIN");
    const { postId, publishedAt, ...rest } = input;

    await prisma.blogPost.update({
      where: { id: postId },
      data: {
        ...rest,
        excerpt: rest.excerpt || null,
        coverAssetId: rest.coverAssetId ?? undefined,
        ...(publishedAt !== undefined
          ? { publishedAt: publishedAt ? new Date(publishedAt) : null }
          : {}),
      },
    });

    return { ok: true };
  } catch (err) {
    const p2002 = handleP2002(err);
    if (p2002) return p2002;
    console.error("[updateBlogPost]", err);
    return { ok: false, error: "Failed to update post." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteBlogPost
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteBlogPost(postId: string): Promise<ActionResult> {
  try {
    await requireRoles("ADMIN");
    await prisma.blogPost.delete({ where: { id: postId } });
    return { ok: true };
  } catch (err) {
    console.error("[deleteBlogPost]", err);
    return { ok: false, error: "Failed to delete post." };
  }
}
