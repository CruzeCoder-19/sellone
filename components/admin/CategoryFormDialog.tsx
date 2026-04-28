"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createCategory, updateCategory } from "@/server/actions/admin.actions";

type Category = { id: string; name: string; parentId: string | null };

type Props =
  | { mode: "create"; category?: never; allCategories: Category[] }
  | { mode: "edit"; category: Category & { name: string; slug: string }; allCategories: Category[] };

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

export function CategoryFormDialog({ mode, category, allCategories }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(mode === "edit" ? category.name : "");
  const [slug, setSlug] = useState(mode === "edit" ? (category as { slug: string }).slug : "");
  const [parentId, setParentId] = useState(
    mode === "edit" ? (category.parentId ?? "") : "",
  );
  const [slugDirty, setSlugDirty] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!slugDirty) setSlug(toSlug(name));
  }, [name, slugDirty]);

  function resetAndOpen() {
    setName(mode === "edit" ? category.name : "");
    setSlug(mode === "edit" ? (category as { slug: string }).slug : "");
    setParentId(mode === "edit" ? (category.parentId ?? "") : "");
    setSlugDirty(mode === "edit");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }
    setSaving(true);
    const result =
      mode === "create"
        ? await createCategory({ name, slug, parentId: parentId || undefined })
        : await updateCategory({
            categoryId: category.id,
            name,
            slug,
            parentId: parentId || undefined,
          });
    setSaving(false);
    if (result.ok) {
      toast.success(mode === "create" ? "Category created" : "Category updated");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  // Exclude self from parent options in edit mode
  const parentOptions = allCategories.filter((c) => mode === "edit" ? c.id !== category.id : true);

  return (
    <>
      <button
        onClick={resetAndOpen}
        className={mode === "create"
          ? "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          : "rounded border border-gray-200 px-2.5 py-1 text-xs hover:bg-gray-50"}
      >
        {mode === "create" ? "+ Add Category" : "Edit"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={handleSubmit} className="w-96 rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-base font-semibold">
              {mode === "create" ? "Add Category" : "Edit Category"}
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" className={inputCls} value={name}
                onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input type="text" className={inputCls} value={slug}
                onChange={(e) => { setSlugDirty(true); setSlug(e.target.value); }} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
              <select className={inputCls} value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">— None (top-level) —</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
