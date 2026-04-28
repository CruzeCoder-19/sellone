"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { approveShop, suspendShop } from "@/server/actions/admin.actions";

type Props = { shopId: string; shopName: string; status: string };

export function ShopActionButtons({ shopId, shopName, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handle(action: "approve" | "suspend") {
    if (!confirm(`${action === "approve" ? "Approve" : "Suspend"} shop "${shopName}"?`)) return;
    setLoading(true);
    const result = action === "approve" ? await approveShop(shopId) : await suspendShop(shopId);
    setLoading(false);
    if (result.ok) {
      toast.success(action === "approve" ? "Shop approved" : "Shop suspended");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {(status === "PENDING" || status === "SUSPENDED") && (
        <button
          onClick={() => handle("approve")}
          disabled={loading}
          className="rounded border border-green-300 bg-green-50 px-2.5 py-1 text-xs text-green-700 hover:bg-green-100 disabled:opacity-50"
        >
          {status === "PENDING" ? "Approve" : "Reinstate"}
        </button>
      )}
      {status === "ACTIVE" && (
        <button
          onClick={() => handle("suspend")}
          disabled={loading}
          className="rounded border border-orange-300 bg-orange-50 px-2.5 py-1 text-xs text-orange-700 hover:bg-orange-100 disabled:opacity-50"
        >
          Suspend
        </button>
      )}
    </div>
  );
}
