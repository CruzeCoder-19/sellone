import Link from "next/link";
import { requireRoles } from "@/lib/auth/helpers";
import { formatPaise } from "@/lib/format";
import { getCreditTransactionsForUser } from "@/server/queries/credit.queries";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Credit Transactions — Wolsell" };

const PAGE_SIZE = 20;

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

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function CreditTransactionsPage({ searchParams }: Props) {
  const user = await requireRoles("CUSTOMER");

  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  const { rows, total } = await getCreditTransactionsForUser(user.id, {
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Credit Transactions</h1>
        <Link href="/customer/credit" className="text-sm text-blue-600 hover:underline">
          ← Back to Credit
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No transactions found.
        </div>
      ) : (
        <>
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
                {rows.map((tx) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Page {safePage} of {totalPages} ({total} total)
            </span>
            <div className="flex gap-2">
              {safePage > 1 && (
                <Link
                  href={`/customer/credit/transactions?page=${safePage - 1}`}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
                >
                  Previous
                </Link>
              )}
              {safePage < totalPages && (
                <Link
                  href={`/customer/credit/transactions?page=${safePage + 1}`}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
