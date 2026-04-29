"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBlogPost, updateBlogPost } from "@/server/actions/blog-admin.actions";
import type { BlogPostRow } from "@/server/queries/blog.queries";

type Props =
  | { mode: "create"; post?: never }
  | { mode: "edit"; post: BlogPostRow };

function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

export function BlogPostForm({ mode, post }: Props) {
  const router = useRouter();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(mode === "edit" ? post.title : "");
  const [slug, setSlug] = useState(mode === "edit" ? post.slug : "");
  const [excerpt, setExcerpt] = useState(mode === "edit" ? (post.excerpt ?? "") : "");
  // TODO: rich text editor in future.
  const [content, setContent] = useState(mode === "edit" ? post.contentMdx : "");
  const [published, setPublished] = useState(
    mode === "edit" ? post.publishedAt !== null : false,
  );
  const [coverAssetId, setCoverAssetId] = useState(
    mode === "edit" ? (post.coverAssetId ?? "") : "",
  );
  const [coverPreviewUrl, setCoverPreviewUrl] = useState(
    mode === "edit" && post.coverAsset
      ? `/api/blobs/${post.coverAsset.store}/${post.coverAsset.key}`
      : "",
  );
  const [coverUploading, setCoverUploading] = useState(false);
  const [slugDirty, setSlugDirty] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!slugDirty) setSlug(toSlug(title));
  }, [title, slugDirty]);

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("store", "blog-covers");
    const res = await fetch("/api/blobs/upload", { method: "POST", body: fd });
    const json = await res.json();
    setCoverUploading(false);
    if (!json.ok) { toast.error("Cover upload failed"); return; }
    setCoverAssetId(json.data.assetId);
    setCoverPreviewUrl(`/api/blobs/${json.data.store}/${json.data.key}`);
    toast.success("Cover image uploaded");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !slug.trim() || !content.trim()) {
      toast.error("Title, slug, and content are required");
      return;
    }
    setSaving(true);

    const publishedAt = published ? new Date().toISOString() : undefined;

    const result = mode === "create"
      ? await createBlogPost({
          title, slug, excerpt: excerpt || undefined, contentMdx: content,
          coverAssetId: coverAssetId || undefined,
          publishedAt,
        })
      : await updateBlogPost({
          postId: post.id, title, slug, excerpt: excerpt || undefined, contentMdx: content,
          coverAssetId: coverAssetId || null,
          publishedAt: published ? (post.publishedAt?.toISOString() ?? new Date().toISOString()) : null,
        });

    setSaving(false);
    if (result.ok) {
      toast.success(mode === "create" ? "Post created" : "Post updated");
      router.push("/admin/blog");
    } else {
      toast.error(result.error);
    }
  }

  const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <label className={labelCls}>Title <span className="text-red-500">*</span></label>
          <input type="text" className={inputCls} value={title}
            onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div>
          <label className={labelCls}>Slug <span className="text-red-500">*</span></label>
          <input type="text" className={inputCls} value={slug}
            onChange={(e) => { setSlugDirty(true); setSlug(e.target.value); }} required />
          <p className="mt-1 text-xs text-gray-400">wolsell.com/blog/{slug || "your-slug"}</p>
        </div>

        <div>
          <label className={labelCls}>Excerpt</label>
          <textarea rows={2} className={inputCls} value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)} placeholder="Brief summary (optional)" />
        </div>

        <div>
          <label className={labelCls}>Content (Markdown) <span className="text-red-500">*</span></label>
          <textarea rows={16} className={`${inputCls} font-mono text-xs`} value={content}
            onChange={(e) => setContent(e.target.value)} required
            placeholder="# Heading&#10;&#10;Your content here..." />
        </div>

        {/* Cover image */}
        <div>
          <label className={labelCls}>Cover Image</label>
          {coverPreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPreviewUrl} alt="Cover" className="mb-2 h-32 rounded-lg object-cover" />
          )}
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
            onChange={handleCoverChange} />
          <button type="button" disabled={coverUploading}
            onClick={() => coverInputRef.current?.click()}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50">
            {coverUploading ? "Uploading…" : coverPreviewUrl ? "Change Cover" : "Upload Cover"}
          </button>
        </div>

        {/* Published toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)}
            className="h-4 w-4 rounded" />
          <div>
            <span className="text-sm font-medium text-gray-900">Published</span>
            <p className="text-xs text-gray-400">
              {published ? "This post is visible on the blog." : "This post is a draft — not publicly visible."}
            </p>
          </div>
        </label>
      </div>

      <div className="flex items-center justify-between">
        <a href="/admin/blog" className="text-sm text-gray-500 hover:underline">← Back to Blog</a>
        <button type="submit" disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? "Saving…" : mode === "create" ? "Create Post" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
