import { requireRoles } from "@/lib/auth/helpers";
import { getBrands } from "@/server/queries/admin.queries";
import { deleteBrand } from "@/server/actions/admin.actions";
import { BrandFormDialog } from "@/components/admin/BrandFormDialog";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Brands — Wolsell Admin" };

export default async function AdminBrandsPage() {
  await requireRoles("ADMIN");
  const brands = await getBrands();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Brands</h1>
        <BrandFormDialog mode="create" />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-right">Products</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {brands.map((brand) => (
              <tr key={brand.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{brand.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{brand.slug}</td>
                <td className="px-4 py-3 text-right">{brand._count.products}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <BrandFormDialog mode="edit" brand={{ id: brand.id, name: brand.name, slug: brand.slug }} />
                    <form action={async () => { "use server"; await deleteBrand(brand.id); }}>
                      <button
                        type="submit"
                        disabled={brand._count.products > 0}
                        className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={(e) => { if (!confirm(`Delete brand "${brand.name}"?`)) e.preventDefault(); }}
                        title={brand._count.products > 0 ? "Reassign products first" : undefined}
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {brands.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No brands yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
