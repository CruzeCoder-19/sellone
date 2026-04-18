"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adjustCredit } from "@/server/actions/credit-admin.actions";

type AdjustType = "INCREASE_OUTSTANDING" | "DECREASE_OUTSTANDING";

type Props = {
  userId: string;
};

export function AdjustCreditDialog({ userId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<AdjustType>("INCREASE_OUTSTANDING");
  const [amountInRupees, setAmountInRupees] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setType("INCREASE_OUTSTANDING");
    setAmountInRupees("");
    setReason("");
    setError(null);
  }

  async function handleSubmit() {
    const parsed = parseFloat(amountInRupees);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid positive amount.");
      return;
    }
    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await adjustCredit({
        userId,
        amountInPaise: Math.round(parsed * 100),
        type,
        reason,
      });
      if (result.ok) {
        toast.success("Balance adjusted successfully.");
        setOpen(false);
        reset();
        router.refresh();
      } else {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => { reset(); setOpen(true); }}
      >
        Manual Adjustment
      </Button>

      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { setOpen(false); reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Credit Adjustment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Adjust the outstanding balance manually. This creates an ADJUSTMENT transaction
              and an audit log entry.
            </p>

            {/* Type */}
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <div className="flex gap-4 text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="adjust-type"
                    checked={type === "INCREASE_OUTSTANDING"}
                    onChange={() => setType("INCREASE_OUTSTANDING")}
                  />
                  Increase Outstanding
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="adjust-type"
                    checked={type === "DECREASE_OUTSTANDING"}
                    onChange={() => setType("DECREASE_OUTSTANDING")}
                  />
                  Decrease Outstanding
                </label>
              </div>
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="adjust-amount">Amount (₹)</Label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-gray-500">₹</span>
                <Input
                  id="adjust-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amountInRupees}
                  onChange={(e) => setAmountInRupees(e.target.value)}
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <Label htmlFor="adjust-reason">Reason</Label>
              <textarea
                id="adjust-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for manual adjustment..."
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button disabled={loading} onClick={handleSubmit}>
              {loading ? "Adjusting…" : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
