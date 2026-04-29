import Link from "next/link";
import { getPublishedPosts } from "@/server/queries/blog.queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — Wolsell",
  description: "Insights, guides, and updates from the Wolsell team.",
};

const PAGE_SIZE = 9;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { rows, total } = await getPublishedPosts({ page, pageSize: PAGE_SIZE });
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
        <p className="mt-2 text-gray-500">Insights, guides, and updates from Wolsell.</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-16 text-center">
          <p className="text-lg text-gray-500">No blog posts yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((post) => {
            const coverUrl = post.coverAsset
              ? `/api/blobs/${post.coverAsset.store}/${post.coverAsset.key}`
              : null;

            return (
              <article key={post.id} className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt={post.title} className="h-48 w-full object-cover" />
                ) : (
                  <div className="h-48 w-full bg-gradient-to-br from-blue-50 to-blue-100" />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <p className="mb-2 text-xs text-gray-400">
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "long", year: "numeric",
                        })
                      : ""}
                    {post.author.name ? ` · ${post.author.name}` : ""}
                  </p>
                  <h2 className="mb-2 text-base font-semibold text-gray-900 line-clamp-2">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mb-4 text-sm text-gray-500 line-clamp-3">{post.excerpt}</p>
                  )}
                  <div className="mt-auto">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Read more →
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={`/blog?page=${page - 1}`}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">
              ← Previous
            </Link>
          )}
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={`/blog?page=${page + 1}`}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
