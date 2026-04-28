import { requireRoles } from "@/lib/auth/helpers";
import { getCategories } from "@/server/queries/admin.queries";
import { deleteCategory } from "@/server/actions/admin.actions";
import { CategoryFormDialog } from "@/components/admin/CategoryFormDialog";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Categories — Wolsell Admin" };

export default async function AdminCategoriesPage() {
  await requireRoles("ADMIN");
  const categories = await getCategories();

  // Sort: parents first, children after (indented by parent)
  const parents = categories.filter((c) => !c.parentId);
  const ordered = parents.flatMap((p) => [
    p,
    ...categories.filter((c) => c.parentId === p.id),
  ]);

  const allForSelect = categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parentId }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categories</h1>
        <CategoryFormDialog mode="create" allCategories={allForSelect} />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Parent</th>
              <th className="px-4 py-3 text-right">Products</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ordered.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  {cat.parentId ? <span className="mr-2 text-gray-300">└</span> : null}
                  {cat.name}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{cat.slug}</td>
                <td className="px-4 py-3 text-gray-600">{cat.parent?.name ?? "—"}</td>
                <td className="px-4 py-3 text-right">{cat._count.products}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <CategoryFormDialog
                      mode="edit"
                      category={{ id: cat.id, name: cat.name, slug: cat.slug, parentId: cat.parentId }}
                      allCategories={allForSelect}
                    />
                    <form
                      action={async () => {
                        "use server";
                        await deleteCategory(cat.id);
                      }}
                    >
                      <button
                        type="submit"
                        disabled={cat._count.products > 0}
                        className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={(e) => {
                          if (!confirm(`Delete category "${cat.name}"?`)) e.preventDefault();
                        }}
                        title={cat._count.products > 0 ? "Reassign products first" : undefined}
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {ordered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No categories yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
