"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createAchieverEntry } from "@/server/actions/admin.actions";

type SalesUser = { id: string; name: string | null; email: string | null };

type Props = { salesUsers: SalesUser[]; defaultPeriod: string };

export function AchieverEntryDialog({ salesUsers, defaultPeriod }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [period, setPeriod] = useState(defaultPeriod);
  const [metric, setMetric] = useState("");
  const [rank, setRank] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !period || !metric) {
      toast.error("User, period, and metric are required");
      return;
    }
    setSaving(true);
    const result = await createAchieverEntry({
      userId,
      period,
      metricInPaise: Math.round(parseFloat(metric) * 100),
      rank: rank ? parseInt(rank, 10) : undefined,
    });
    setSaving(false);
    if (result.ok) {
      toast.success("Entry saved");
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
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
        + Add Entry
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={handleSubmit} className="w-96 rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-base font-semibold">Add / Update Achiever Entry</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sales User *</label>
              <select className={inputCls} value={userId} onChange={(e) => setUserId(e.target.value)} required>
                <option value="">— Select user —</option>
                {salesUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email ?? u.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period (YYYY-MM) *</label>
              <input type="text" className={inputCls} value={period}
                onChange={(e) => setPeriod(e.target.value)} placeholder="2026-04" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metric (₹) *</label>
              <input type="number" className={inputCls} value={metric}
                onChange={(e) => setMetric(e.target.value)} min="0" step="0.01" placeholder="25000" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rank (optional)</label>
              <input type="number" className={inputCls} value={rank}
                onChange={(e) => setRank(e.target.value)} min="1" placeholder="1" />
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
