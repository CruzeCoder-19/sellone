import Link from "next/link";
import { requireRoles } from "@/lib/auth/helpers";
import { getAllPostsAdmin } from "@/server/queries/blog.queries";
import { deleteBlogPost } from "@/server/actions/blog-admin.actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Blog — Wolsell Admin" };

const PAGE_SIZE = 20;

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRoles("ADMIN");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { rows, total } = await getAllPostsAdmin({ page, pageSize: PAGE_SIZE });
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Blog Posts</h1>
        <Link href="/admin/blog/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          + New Post
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Author</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{post.title}</p>
                  <p className="text-xs font-mono text-gray-400">{post.slug}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{post.author.name ?? "—"}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                    post.publishedAt ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {post.publishedAt ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/blog/${post.id}/edit`}
                      className="rounded border border-gray-200 px-2.5 py-1 text-xs hover:bg-gray-50">
                      Edit
                    </Link>
                    {post.publishedAt && (
                      <Link href={`/blog/${post.slug}`} target="_blank"
                        className="rounded border border-blue-200 px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50">
                        View
                      </Link>
                    )}
                    <form action={async () => {
                      "use server";
                      await deleteBlogPost(post.id);
                    }}>
                      <button type="submit"
                        className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                        onClick={(e) => { if (!confirm(`Delete "${post.title}"?`)) e.preventDefault(); }}>
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No posts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && <Link href={`/admin/blog?page=${page - 1}`}
            className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">← Previous</Link>}
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          {page < totalPages && <Link href={`/admin/blog?page=${page + 1}`}
            className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">Next →</Link>}
        </div>
      )}
    </div>
  );
}
