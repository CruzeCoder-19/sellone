"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createCoupon, updateCoupon } from "@/server/actions/admin.actions";
import type { Coupon } from "@prisma/client";

type Props =
  | { mode: "create"; coupon?: never }
  | { mode: "edit"; coupon: Coupon };

export function CouponFormDialog({ mode, coupon }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(mode === "edit" ? coupon.code : "");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FLAT">(
    mode === "edit" ? coupon.discountType : "PERCENT",
  );
  const [value, setValue] = useState(
    mode === "edit"
      ? discountType === "FLAT"
        ? String(coupon.value / 100)
        : String(coupon.value)
      : "",
  );
  const [minOrder, setMinOrder] = useState(
    mode === "edit" && coupon.minOrderInPaise ? String(coupon.minOrderInPaise / 100) : "",
  );
  const [maxDiscount, setMaxDiscount] = useState(
    mode === "edit" && coupon.maxDiscountInPaise ? String(coupon.maxDiscountInPaise / 100) : "",
  );
  const [expiresAt, setExpiresAt] = useState(
    mode === "edit" && coupon.expiresAt
      ? new Date(coupon.expiresAt).toISOString().split("T")[0]
      : "",
  );
  const [usageLimit, setUsageLimit] = useState(
    mode === "edit" && coupon.usageLimit ? String(coupon.usageLimit) : "",
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedValue = discountType === "FLAT"
      ? Math.round(parseFloat(value || "0") * 100)
      : parseInt(value || "0", 10);

    setSaving(true);
    const result = mode === "create"
      ? await createCoupon({
          code,
          discountType,
          value: parsedValue,
          minOrderInPaise: minOrder ? Math.round(parseFloat(minOrder) * 100) : undefined,
          maxDiscountInPaise: maxDiscount ? Math.round(parseFloat(maxDiscount) * 100) : undefined,
          expiresAt: expiresAt || undefined,
          usageLimit: usageLimit ? parseInt(usageLimit, 10) : undefined,
        })
      : await updateCoupon({
          couponId: coupon.id,
          code,
          discountType,
          value: parsedValue,
          minOrderInPaise: minOrder ? Math.round(parseFloat(minOrder) * 100) : 0,
          maxDiscountInPaise: maxDiscount ? Math.round(parseFloat(maxDiscount) * 100) : null,
          expiresAt: expiresAt || null,
          usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
        });
    setSaving(false);

    if (result.ok) {
      toast.success(mode === "create" ? "Coupon created" : "Coupon updated");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <>
      <button onClick={() => setOpen(true)}
        className={mode === "create"
          ? "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          : "rounded border border-gray-200 px-2.5 py-1 text-xs hover:bg-gray-50"}>
        {mode === "create" ? "+ Add Coupon" : "Edit"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8">
          <form onSubmit={handleSubmit} className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-base font-semibold">{mode === "create" ? "Add Coupon" : "Edit Coupon"}</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input type="text" className={inputCls} value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())} required placeholder="e.g. WELCOME10" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
              <div className="flex gap-4">
                {(["PERCENT", "FLAT"] as const).map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" checked={discountType === t} onChange={() => setDiscountType(t)} />
                    {t === "PERCENT" ? "Percentage (%)" : "Flat Amount (₹)"}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {discountType === "PERCENT" ? "Discount %" : "Discount Amount (₹)"} *
              </label>
              <input type="number" className={inputCls} value={value}
                onChange={(e) => setValue(e.target.value)}
                min="0" step={discountType === "PERCENT" ? "1" : "0.01"} max={discountType === "PERCENT" ? "100" : undefined}
                required placeholder={discountType === "PERCENT" ? "e.g. 10" : "e.g. 500"} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Order (₹)</label>
                <input type="number" className={inputCls} value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)} min="0" step="0.01" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (₹)</label>
                <input type="number" className={inputCls} value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)} min="0" step="0.01" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input type="date" className={inputCls} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
                <input type="number" className={inputCls} value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)} min="1" placeholder="Unlimited" />
              </div>
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
