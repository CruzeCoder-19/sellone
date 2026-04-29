import { requireRoles } from "@/lib/auth/helpers";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "New Post — Wolsell Admin" };

export default async function NewBlogPostPage() {
  await requireRoles("ADMIN");
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">New Blog Post</h1>
      <BlogPostForm mode="create" />
    </div>
  );
}
