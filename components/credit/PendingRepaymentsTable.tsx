"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatPaise } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { verifyRepayment } from "@/server/actions/credit-admin.actions";
import type { PendingRepaymentRow } from "@/server/queries/credit-admin.queries";

const METHOD_LABELS: Record<string, string> = { BANK: "Bank Transfer", UPI: "UPI" };

export function PendingRepaymentsTable({ rows }: { rows: PendingRepaymentRow[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);

  async function handleConfirm(transactionId: string) {
    setLoadingId(transactionId);
    try {
      const result = await verifyRepayment({ transactionId, decision: "CONFIRM" });
      if (result.ok) {
        toast.success("Repayment confirmed.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function handleReject(transactionId: string) {
    setLoadingId(transactionId);
    setRejectDialogId(null);
    try {
      const result = await verifyRepayment({ transactionId, decision: "REJECT" });
      if (result.ok) {
        toast.success("Repayment rejected.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setLoadingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No pending repayments.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-left">Method</th>
              <th className="px-4 py-3 text-left">UTR Reference</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const isLoading = loadingId === row.id;
              return (
                <tr key={row.id} className="bg-white hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {row.creditAccount.user.name ?? "—"}
                    </p>
                    <p className="text-xs text-gray-500">{row.creditAccount.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatPaise(row.amountInPaise)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.method ? (METHOD_LABELS[row.method] ?? row.method) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {row.utrReference ? (
                      <span className="font-mono text-xs">{row.utrReference}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(row.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={isLoading}
                        onClick={() => handleConfirm(row.id)}
                        className="bg-green-600 text-white hover:bg-green-700"
                      >
                        {isLoading ? "…" : "Confirm"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isLoading}
                        onClick={() => setRejectDialogId(row.id)}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Reject confirmation dialog */}
      <Dialog open={rejectDialogId !== null} onOpenChange={(open) => !open && setRejectDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Repayment?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            This will mark the repayment as rejected. The outstanding balance will not change.
            Are you sure?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogId(null)}>
              Cancel
            </Button>
            <Button
              disabled={loadingId === rejectDialogId}
              onClick={() => rejectDialogId && handleReject(rejectDialogId)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {loadingId === rejectDialogId ? "Rejecting…" : "Yes, Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
