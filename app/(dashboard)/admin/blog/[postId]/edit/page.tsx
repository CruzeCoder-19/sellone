import { notFound } from "next/navigation";
import { requireRoles } from "@/lib/auth/helpers";
import { getPostByIdAdmin } from "@/server/queries/blog.queries";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Post — Wolsell Admin" };

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  await requireRoles("ADMIN");
  const { postId } = await params;
  const post = await getPostByIdAdmin(postId);
  if (!post) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit Post</h1>
      <BlogPostForm mode="edit" post={post} />
    </div>
  );
}
