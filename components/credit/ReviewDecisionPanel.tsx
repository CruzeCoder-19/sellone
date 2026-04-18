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
import { reviewCreditApplication } from "@/server/actions/credit-admin.actions";

type Props = {
  applicationId: string;
  monthlyTurnoverInPaise: number | null;
};

export function ReviewDecisionPanel({ applicationId, monthlyTurnoverInPaise }: Props) {
  const router = useRouter();
  const suggestedLimitInRupees = monthlyTurnoverInPaise
    ? ((monthlyTurnoverInPaise * 2) / 100).toString()
    : "";

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [limitInRupees, setLimitInRupees] = useState(suggestedLimitInRupees);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    const parsed = parseFloat(limitInRupees);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid credit limit.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await reviewCreditApplication({
        applicationId,
        decision: "APPROVE",
        limitInPaise: Math.round(parsed * 100),
      });
      if (result.ok) {
        toast.success("Application approved. Credit account is now active.");
        router.push("/employee/credit");
      } else {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      setError("Rejection reason is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await reviewCreditApplication({
        applicationId,
        decision: "REJECT",
        rejectionReason,
      });
      if (result.ok) {
        toast.success("Application rejected.");
        router.push("/employee/credit");
      } else {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">Decision</h2>
      <p className="mt-1 text-sm text-gray-500">
        Review the application above before approving or rejecting.
      </p>

      <div className="mt-4 flex gap-3">
        <Button
          className="bg-green-600 text-white hover:bg-green-700"
          onClick={() => { setError(null); setApproveOpen(true); }}
        >
          Approve
        </Button>
        <Button
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50"
          onClick={() => { setError(null); setRejectionReason(""); setRejectOpen(true); }}
        >
          Reject
        </Button>
      </div>

      {/* Approve dialog */}
      <Dialog open={approveOpen} onOpenChange={(open) => !open && setApproveOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Credit Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Set the credit limit for this customer. The suggested value is 2× their monthly
              turnover.
            </p>
            <div>
              <Label htmlFor="credit-limit">Credit Limit (₹)</Label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-gray-500">₹</span>
                <Input
                  id="credit-limit"
                  type="number"
                  min="1"
                  step="1"
                  value={limitInRupees}
                  onChange={(e) => setLimitInRupees(e.target.value)}
                />
              </div>
            </div>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={loading}
              onClick={handleApprove}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {loading ? "Approving…" : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={(open) => !open && setRejectOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Credit Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Provide a reason for rejection. This will be shown to the customer and they will
              be able to re-apply.
            </p>
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <textarea
                id="rejection-reason"
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Insufficient business history, PAN verification failed..."
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
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={loading}
              onClick={handleReject}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {loading ? "Rejecting…" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
