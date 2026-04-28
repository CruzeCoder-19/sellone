"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateCoupon } from "@/server/actions/admin.actions";

type Props = { couponId: string; active: boolean };

export function CouponActiveToggle({ couponId, active }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(active);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const result = await updateCoupon({ couponId, active: !value });
    setLoading(false);
    if (result.ok) {
      setValue((v) => !v);
      toast.success(value ? "Coupon deactivated" : "Coupon activated");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
        value ? "bg-green-500" : "bg-gray-300"
      }`}
      aria-label={value ? "Deactivate" : "Activate"}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
        value ? "translate-x-4" : "translate-x-1"
      }`} />
    </button>
  );
}
