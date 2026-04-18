import Link from "next/link";
import { requireRoles } from "@/lib/auth/helpers";
import { formatPaise } from "@/lib/format";
import { getCreditAccountForUser, getCreditApplicationForUser, getCreditTransactionsForUser } from "@/server/queries/credit.queries";
import { RecordRepaymentDialog } from "@/components/credit/RecordRepaymentDialog";
import { DownloadStatementButton } from "@/components/credit/DownloadStatementButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Wolsell Credit — My Account" };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const TX_TYPE_LABELS: Record<string, string> = {
  CHARGE: "Purchase",
  REPAYMENT: "Repayment",
  ADJUSTMENT: "Adjustment",
};

const TX_TYPE_COLORS: Record<string, string> = {
  CHARGE: "bg-blue-50 text-blue-700",
  REPAYMENT: "bg-green-50 text-green-700",
  ADJUSTMENT: "bg-gray-100 text-gray-600",
};

const TX_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmed",
  PENDING_VERIFICATION: "Pending",
  REJECTED: "Rejected",
};

const TX_STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-green-50 text-green-700",
  PENDING_VERIFICATION: "bg-yellow-50 text-yellow-700",
  REJECTED: "bg-red-50 text-red-700",
};

function progressColor(outstanding: number, limit: number) {
  if (limit === 0) return "bg-gray-300";
  const pct = outstanding / limit;
  if (pct > 0.8) return "bg-red-500";
  if (pct > 0.5) return "bg-yellow-400";
  return "bg-green-500";
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function CreditPage() {
  const user = await requireRoles("CUSTOMER");

  const [account, latestApp] = await Promise.all([
    getCreditAccountForUser(user.id),
    getCreditApplicationForUser(user.id),
  ]);

  // Determine which state to render
  const isApproved = account?.status === "APPROVED";
  const isSuspended = account?.status === "SUSPENDED";
  const isPending = latestApp?.status === "PENDING";
  const hasNoCredit = !latestApp && (!account || account.status === "NONE");
  const isRejected = !isApproved && !isSuspended && !isPending && !hasNoCredit;

  // ── STATE D: Approved ───────────────────────────────────────────────────
  if (isApproved && account) {
    const { rows: transactions } = await getCreditTransactionsForUser(user.id, {
      page: 1,
      pageSize: 5,
    });

    const usedPct = account.limitInPaise > 0
      ? Math.min(100, (account.outstandingInPaise / account.limitInPaise) * 100)
      : 0;

    return (
      <div className="space-y-8">
        <h1 className="text-xl font-semibold">Wolsell Credit</h1>

        {/* Credit summary card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Credit Limit</p>
              <p className="mt-1 text-lg font-semibold">{formatPaise(account.limitInPaise)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Outstanding</p>
              <p className="mt-1 text-lg font-semibold text-orange-600">
                {formatPaise(account.outstandingInPaise)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Available</p>
              <p className="mt-1 text-lg font-semibold text-green-600">
                {formatPaise(account.availableInPaise)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progressColor(account.outstandingInPaise, account.limitInPaise)}`}
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-gray-400">
              {usedPct.toFixed(0)}% used
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <RecordRepaymentDialog
              outstandingInPaise={account.outstandingInPaise}
              userId={user.id}
            />
            <DownloadStatementButton userId={user.id} />
          </div>
        </div>

        {/* Recent transactions */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent Transactions</h2>
            <Link
              href="/customer/credit/transactions"
              className="text-sm text-blue-600 hover:underline"
            >
              View all
            </Link>
          </div>

          {transactions.length === 0 ? (
            <p className="text-sm text-gray-500">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Order / UTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="bg-white hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(tx.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${TX_TYPE_COLORS[tx.type] ?? "bg-gray-100 text-gray-600"}`}>
                          {TX_TYPE_LABELS[tx.type] ?? tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatPaise(tx.amountInPaise)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${TX_STATUS_COLORS[tx.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {TX_STATUS_LABELS[tx.status] ?? tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {tx.relatedOrder ? (
                          <Link
                            href={`/customer/orders/${tx.relatedOrder.orderNumber}`}
                            className="text-blue-600 hover:underline"
                          >
                            {tx.relatedOrder.orderNumber}
                          </Link>
                        ) : tx.utrReference ? (
                          <span className="font-mono text-xs">{tx.utrReference}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── STATE E: Suspended ───────────────────────────────────────────────────
  if (isSuspended && account) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Wolsell Credit</h1>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
          <h2 className="text-base font-semibold text-orange-800">Account Suspended</h2>
          <p className="mt-2 text-sm text-orange-700">
            Your Wolsell Credit account has been suspended. Please contact support to resolve this.
          </p>
          <p className="mt-4 text-sm">
            Outstanding balance:{" "}
            <span className="font-semibold">{formatPaise(account.outstandingInPaise)}</span>
          </p>
        </div>
      </div>
    );
  }

  // ── STATE B: Pending review ──────────────────────────────────────────────
  if (isPending && latestApp) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Wolsell Credit</h1>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-base font-semibold text-blue-800">Application Under Review</h2>
          <p className="mt-2 text-sm text-blue-700">
            Submitted on{" "}
            {new Date(latestApp.submittedAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            . We&apos;ll notify you once reviewed.
          </p>
        </div>
      </div>
    );
  }

  // ── STATE C: Rejected / closed ───────────────────────────────────────────
  if (isRejected && latestApp) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Wolsell Credit</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-base font-semibold text-red-800">Application Not Approved</h2>
          {latestApp.rejectionReason && (
            <p className="mt-2 text-sm text-red-700">{latestApp.rejectionReason}</p>
          )}
          <div className="mt-4">
            <Link
              href="/customer/credit/apply"
              className="inline-flex h-8 items-center rounded-lg bg-red-700 px-4 text-sm font-medium text-white hover:bg-red-800"
            >
              Re-apply
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── STATE A: No account / NONE ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Wolsell Credit</h1>
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl">
          ₹
        </div>
        <h2 className="text-lg font-semibold text-gray-900">
          Grow your business with Wolsell Credit
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Get a revolving credit limit to buy inventory now and pay later. Fast approvals,
          flexible repayments, and no hidden charges.
        </p>
        <div className="mt-6">
          <Link
            href="/customer/credit/apply"
            className="inline-flex h-9 items-center rounded-lg bg-blue-600 px-6 text-sm font-medium text-white hover:bg-blue-700"
          >
            Apply for Credit
          </Link>
        </div>
      </div>
    </div>
  );
}
