"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBrand, updateBrand } from "@/server/actions/admin.actions";

type Props =
  | { mode: "create"; brand?: never }
  | { mode: "edit"; brand: { id: string; name: string; slug: string } };

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

export function BrandFormDialog({ mode, brand }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(mode === "edit" ? brand.name : "");
  const [slug, setSlug] = useState(mode === "edit" ? brand.slug : "");
  const [slugDirty, setSlugDirty] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!slugDirty) setSlug(toSlug(name));
  }, [name, slugDirty]);

  function resetAndOpen() {
    setName(mode === "edit" ? brand.name : "");
    setSlug(mode === "edit" ? brand.slug : "");
    setSlugDirty(mode === "edit");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) { toast.error("Name and slug are required"); return; }
    setSaving(true);
    const result = mode === "create"
      ? await createBrand({ name, slug })
      : await updateBrand({ brandId: brand.id, name, slug });
    setSaving(false);
    if (result.ok) {
      toast.success(mode === "create" ? "Brand created" : "Brand updated");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <>
      <button onClick={resetAndOpen}
        className={mode === "create"
          ? "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          : "rounded border border-gray-200 px-2.5 py-1 text-xs hover:bg-gray-50"}>
        {mode === "create" ? "+ Add Brand" : "Edit"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={handleSubmit} className="w-80 rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-base font-semibold">{mode === "create" ? "Add Brand" : "Edit Brand"}</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input type="text" className={inputCls} value={slug}
                onChange={(e) => { setSlugDirty(true); setSlug(e.target.value); }} required />
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
