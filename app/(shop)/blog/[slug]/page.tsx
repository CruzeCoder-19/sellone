import { notFound } from "next/navigation";
import { marked } from "marked";
import { getPostBySlug } from "@/server/queries/blog.queries";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: `${post.title} — Wolsell Blog`,
    description: post.excerpt ?? undefined,
  };
}

function readingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  // TODO: switch to full MDX compiler (next-mdx-remote) if content needs React components.
  const htmlContent = marked.parse(post.contentMdx) as string;
  const mins = readingTime(post.contentMdx);

  const coverUrl = post.coverAsset
    ? `/api/blobs/${post.coverAsset.store}/${post.coverAsset.key}`
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {/* Back link */}
      <a href="/blog" className="mb-8 inline-block text-sm text-blue-600 hover:underline">
        ← Back to Blog
      </a>

      {/* Cover image */}
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt={post.title}
          className="mb-8 h-64 w-full rounded-xl object-cover sm:h-80"
        />
      )}

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">{post.title}</h1>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500">
          {post.publishedAt && (
            <span>
              {new Date(post.publishedAt).toLocaleDateString("en-IN", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </span>
          )}
          {post.author.name && <span>· {post.author.name}</span>}
          <span>· {mins} min read</span>
        </div>
        {post.excerpt && (
          <p className="mt-4 text-lg text-gray-600 leading-relaxed">{post.excerpt}</p>
        )}
      </header>

      {/* Content — rendered Markdown with Tailwind v4 arbitrary child selectors */}
      <div
        className="
          text-base text-gray-700 leading-relaxed
          [&_h1]:mb-4 [&_h1]:mt-8 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-gray-900
          [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-gray-900
          [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-gray-900
          [&_p]:mb-4
          [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6
          [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6
          [&_li]:mb-1
          [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600
          [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm
          [&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-gray-900 [&_pre]:p-4 [&_pre]:text-sm
          [&_a]:text-blue-600 [&_a]:underline [&_a:hover]:text-blue-800
          [&_hr]:my-8 [&_hr]:border-gray-200
          [&_strong]:font-semibold [&_strong]:text-gray-900
        "
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
