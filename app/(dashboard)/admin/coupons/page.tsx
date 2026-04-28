import Link from "next/link";
import { requireRoles } from "@/lib/auth/helpers";
import { getCoupons } from "@/server/queries/admin.queries";
import { CouponFormDialog } from "@/components/admin/CouponFormDialog";
import { CouponActiveToggle } from "@/components/admin/CouponActiveToggle";
import { formatPaise } from "@/lib/format";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Coupons — Wolsell Admin" };

const PAGE_SIZE = 20;

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRoles("ADMIN");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { rows, total } = await getCoupons({ page, pageSize: PAGE_SIZE });
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Coupons</h1>
        <CouponFormDialog mode="create" />
      </div>

      <div className="overflow-x-auto overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3 text-right">Min Order</th>
              <th className="px-4 py-3 text-left">Expires</th>
              <th className="px-4 py-3 text-center">Usage</th>
              <th className="px-4 py-3 text-center">Active</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-semibold text-gray-900">{coupon.code}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                    coupon.discountType === "PERCENT" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"
                  }`}>
                    {coupon.discountType}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {coupon.discountType === "PERCENT"
                    ? `${coupon.value}%`
                    : formatPaise(coupon.value)}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {coupon.minOrderInPaise > 0 ? formatPaise(coupon.minOrderInPaise) : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {coupon.expiresAt
                    ? new Date(coupon.expiresAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })
                    : "Never"}
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-600">
                  {coupon.usedCount}{coupon.usageLimit ? `/${coupon.usageLimit}` : ""}
                </td>
                <td className="px-4 py-3 text-center">
                  <CouponActiveToggle couponId={coupon.id} active={coupon.active} />
                </td>
                <td className="px-4 py-3 text-right">
                  <CouponFormDialog mode="edit" coupon={coupon} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No coupons yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && <Link href={`/admin/coupons?page=${page - 1}`}
            className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">← Previous</Link>}
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          {page < totalPages && <Link href={`/admin/coupons?page=${page + 1}`}
            className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">Next →</Link>}
        </div>
      )}
    </div>
  );
}
