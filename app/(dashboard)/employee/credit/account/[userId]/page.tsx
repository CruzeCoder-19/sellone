import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRoles } from "@/lib/auth/helpers";
import { formatPaise } from "@/lib/format";
import {
  getCreditAccountDetails,
  getTransactionsForAccount,
} from "@/server/queries/credit-admin.queries";
import { AccountActionButtons } from "@/components/credit/AccountActionButtons";
import { AdjustCreditDialog } from "@/components/credit/AdjustCreditDialog";
import { DownloadStatementButton } from "@/components/credit/DownloadStatementButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Account Details — Wolsell Credit" };

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<string, string> = {
  NONE: "None",
  PENDING: "Pending",
  APPROVED: "Approved",
  SUSPENDED: "Suspended",
  CLOSED: "Closed",
};

const STATUS_COLORS: Record<string, string> = {
  NONE: "bg-gray-100 text-gray-600",
  PENDING: "bg-yellow-50 text-yellow-700",
  APPROVED: "bg-green-50 text-green-700",
  SUSPENDED: "bg-orange-50 text-orange-700",
  CLOSED: "bg-red-50 text-red-700",
};

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

type Props = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function CreditAccountDetailPage({ params, searchParams }: Props) {
  await requireRoles("EMPLOYEE", "ADMIN");

  const { userId } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  const account = await getCreditAccountDetails(userId);
  if (!account) notFound();

  const { rows: transactions, total: txTotal } = await getTransactionsForAccount(account.id, {
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(txTotal / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const usedPct =
    account.limitInPaise > 0
      ? Math.min(100, (account.outstandingInPaise / account.limitInPaise) * 100)
      : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {account.user.name ?? account.user.email}
          </h1>
          <p className="text-sm text-gray-500">{account.user.email}</p>
          {account.user.phone && (
            <p className="text-sm text-gray-500">{account.user.phone}</p>
          )}
        </div>
        <Link
          href="/employee/credit?tab=accounts"
          className="text-sm text-blue-600 hover:underline"
        >
          ← All Accounts
        </Link>
      </div>

      {/* Account summary card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Credit Account</h2>
          <div className="flex items-center gap-3">
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[account.status] ?? "bg-gray-100 text-gray-600"}`}
            >
              {STATUS_LABELS[account.status] ?? account.status}
            </span>
            <AccountActionButtons userId={userId} status={account.status} />
            <AdjustCreditDialog userId={userId} />
            <DownloadStatementButton userId={userId} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Credit Limit</p>
            <p className="mt-1 text-lg font-semibold">{formatPaise(account.limitInPaise)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Outstanding</p>
            <p className="mt-1 text-lg font-semibold text-orange-600">
              {formatPaise(account.outstandingInPaise)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Available</p>
            <p className="mt-1 text-lg font-semibold text-green-600">
              {formatPaise(account.availableInPaise)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${progressColor(account.outstandingInPaise, account.limitInPaise)}`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-gray-400">{usedPct.toFixed(0)}% used</p>
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <h2 className="mb-3 text-base font-semibold">Transaction History</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500">No transactions yet.</p>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Order / UTR</th>
                    <th className="px-4 py-3 text-left">Verified By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="bg-white hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(tx.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${TX_TYPE_COLORS[tx.type] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {TX_TYPE_LABELS[tx.type] ?? tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatPaise(tx.amountInPaise)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${TX_STATUS_COLORS[tx.status] ?? "bg-gray-100 text-gray-600"}`}
                        >
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
                      <td className="px-4 py-3 text-gray-600">
                        {tx.verifiedBy?.name ?? <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Page {safePage} of {totalPages} ({txTotal} total)
                </span>
                <div className="flex gap-2">
                  {safePage > 1 && (
                    <Link
                      href={`/employee/credit/account/${userId}?page=${safePage - 1}`}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
                    >
                      Previous
                    </Link>
                  )}
                  {safePage < totalPages && (
                    <Link
                      href={`/employee/credit/account/${userId}?page=${safePage + 1}`}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Application history */}
      {account.applications.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold">Application History</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Submitted</th>
                  <th className="px-4 py-3 text-left">Legal Name</th>
                  <th className="px-4 py-3 text-left">Outcome</th>
                  <th className="px-4 py-3 text-left">KYC Docs</th>
                  <th className="px-4 py-3 text-left">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {account.applications.map((app) => (
                  <tr key={app.id} className="bg-white hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(app.submittedAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{app.legalName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[app.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {STATUS_LABELS[app.status] ?? app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {app.kycAssets.length === 0 ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {app.kycAssets.map(({ asset }) => (
                            <a
                              key={asset.id}
                              href={`/api/blobs/${asset.store}/${asset.key}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline font-mono"
                            >
                              {asset.key.split("/").pop() ?? asset.key}
                            </a>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {app.rejectionReason ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
