"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSalesProfile } from "@/server/actions/sales.actions";

export function SalesSetupForm() {
  const router = useRouter();
  const [region, setRegion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const result = await createSalesProfile({ region: region || undefined });
    setSubmitting(false);

    if (result.ok) {
      toast.success("Profile created");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Region <span className="text-xs text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          className={inputCls}
          placeholder="e.g. West India"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Setting up…" : "Set Up Profile"}
      </button>
    </form>
  );
}
