"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { recordRepayment } from "@/server/actions/credit.actions";
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
import { formatPaise } from "@/lib/format";

interface Props {
  outstandingInPaise: number;
  userId: string;
}

export function RecordRepaymentDialog({ outstandingInPaise, userId }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amountRupees, setAmountRupees] = useState("");
  const [method, setMethod] = useState<"BANK" | "UPI">("BANK");
  const [utrReference, setUtrReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setAmountRupees("");
    setMethod("BANK");
    setUtrReference("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const rupees = parseFloat(amountRupees);
    if (isNaN(rupees) || rupees <= 0) {
      setError("Enter a valid amount greater than ₹0.");
      return;
    }

    const amountInPaise = Math.round(rupees * 100);

    setSubmitting(true);
    try {
      const result = await recordRepayment({ amountInPaise, method, utrReference });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Repayment recorded — pending verification");
      await queryClient.invalidateQueries({ queryKey: ["credit-account", userId] });
      setOpen(false);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
      >
        Record Repayment
      </Button>

      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) resetForm();
          setOpen(isOpen);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Repayment</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Outstanding balance:{" "}
            <span className="font-semibold text-foreground">
              {formatPaise(outstandingInPaise)}
            </span>
          </p>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="repay-amount">Amount (₹)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
                  ₹
                </span>
                <Input
                  id="repay-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-6"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="repay-method">Payment Method</Label>
              <select
                id="repay-method"
                value={method}
                onChange={(e) => setMethod(e.target.value as "BANK" | "UPI")}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="BANK">Bank Transfer</option>
                <option value="UPI">UPI</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="repay-utr">UTR / Reference Number</Label>
              <Input
                id="repay-utr"
                type="text"
                placeholder="Enter transaction reference"
                value={utrReference}
                onChange={(e) => setUtrReference(e.target.value)}
                required
              />
            </div>

            <DialogFooter showCloseButton>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Repayment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
