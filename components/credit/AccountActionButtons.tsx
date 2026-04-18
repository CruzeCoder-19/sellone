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
import { Label } from "@/components/ui/label";
import { suspendCreditAccount, reinstateCreditAccount } from "@/server/actions/credit-admin.actions";

type Props = {
  userId: string;
  status: string;
};

export function AccountActionButtons({ userId, status }: Props) {
  const router = useRouter();
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reinstateOpen, setReinstateOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSuspend() {
    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await suspendCreditAccount({ userId, reason });
      if (result.ok) {
        toast.success("Account suspended.");
        setSuspendOpen(false);
        setReason("");
        router.refresh();
      } else {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReinstate() {
    setLoading(true);
    setError(null);
    try {
      const result = await reinstateCreditAccount({ userId });
      if (result.ok) {
        toast.success("Account reinstated.");
        setReinstateOpen(false);
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
      {status === "APPROVED" && (
        <Button
          size="sm"
          variant="outline"
          className="border-orange-200 text-orange-600 hover:bg-orange-50"
          onClick={() => { setError(null); setReason(""); setSuspendOpen(true); }}
        >
          Suspend
        </Button>
      )}
      {status === "SUSPENDED" && (
        <Button
          size="sm"
          variant="outline"
          className="border-green-200 text-green-600 hover:bg-green-50"
          onClick={() => { setError(null); setReinstateOpen(true); }}
        >
          Reinstate
        </Button>
      )}

      {/* Suspend dialog */}
      <Dialog open={suspendOpen} onOpenChange={(open) => !open && setSuspendOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Credit Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              The customer will lose access to credit immediately. Provide a reason for the record.
            </p>
            <div>
              <Label htmlFor="suspend-reason">Reason</Label>
              <textarea
                id="suspend-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Payment default, policy violation..."
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={loading}
              onClick={handleSuspend}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {loading ? "Suspending…" : "Suspend Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reinstate dialog */}
      <Dialog open={reinstateOpen} onOpenChange={(open) => !open && setReinstateOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reinstate Credit Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            This will restore the customer&apos;s access to credit with their existing limit.
            Are you sure?
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReinstateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={loading}
              onClick={handleReinstate}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {loading ? "Reinstating…" : "Yes, Reinstate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
