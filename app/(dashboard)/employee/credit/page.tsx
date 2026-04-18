import Link from "next/link";
import { requireRoles } from "@/lib/auth/helpers";
import { formatPaise } from "@/lib/format";
import {
  getPendingCounts,
  getPendingApplications,
  getPendingRepayments,
  getAllCreditAccounts,
} from "@/server/queries/credit-admin.queries";
import { PendingRepaymentsTable } from "@/components/credit/PendingRepaymentsTable";
import { AccountActionButtons } from "@/components/credit/AccountActionButtons";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Credit Management — Wolsell" };

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

function maskPan(pan: string) {
  return `${pan.slice(0, 5)}****${pan.slice(-1)}`;
}

type Props = {
  searchParams: Promise<{ tab?: string; page?: string; status?: string }>;
};

export default async function EmployeeCreditPage({ searchParams }: Props) {
  await requireRoles("EMPLOYEE", "ADMIN");

  const { tab = "applications", page: pageStr, status: statusFilter } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  // Always fetch counts for tab badges
  const counts = await getPendingCounts();

  // ─── Tab navigation ─────────────────────────────────────────────────────────
  const tabs = [
    {
      key: "applications",
      label: `Pending Applications${counts.applications > 0 ? ` (${counts.applications})` : ""}`,
      href: "/employee/credit?tab=applications",
    },
    {
      key: "repayments",
      label: `Pending Repayments${counts.repayments > 0 ? ` (${counts.repayments})` : ""}`,
      href: "/employee/credit?tab=repayments",
    },
    {
      key: "accounts",
      label: "All Accounts",
      href: "/employee/credit?tab=accounts",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Credit Management</h1>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border border-b-white border-gray-200 bg-white text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* ── Tab: Pending Applications ─────────────────────────────────────── */}
      {tab === "applications" && <ApplicationsTab page={page} />}

      {/* ── Tab: Pending Repayments ───────────────────────────────────────── */}
      {tab === "repayments" && <RepaymentsTab page={page} />}

      {/* ── Tab: All Accounts ─────────────────────────────────────────────── */}
      {tab === "accounts" && (
        <AccountsTab page={page} statusFilter={statusFilter} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (server-rendered, defined in same file)
// ─────────────────────────────────────────────────────────────────────────────

async function ApplicationsTab({ page }: { page: number }) {
  const { rows, total } = await getPendingApplications({ page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No pending applications.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Applicant</th>
              <th className="px-4 py-3 text-left">PAN</th>
              <th className="px-4 py-3 text-left">GSTIN</th>
              <th className="px-4 py-3 text-right">Monthly Turnover</th>
              <th className="px-4 py-3 text-left">Submitted</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="bg-white hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{row.user.name ?? "—"}</p>
                  <p className="text-xs text-gray-500">{row.user.email}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{maskPan(row.panNumber)}</td>
                <td className="px-4 py-3 text-gray-600">{row.gstin ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  {row.monthlyTurnoverInPaise != null
                    ? formatPaise(row.monthlyTurnoverInPaise)
                    : "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {new Date(row.submittedAt).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/employee/credit/review/${row.id}`}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination safePage={safePage} totalPages={totalPages} tab="applications" />
    </div>
  );
}

async function RepaymentsTab({ page }: { page: number }) {
  const { rows, total } = await getPendingRepayments({ page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  return (
    <div className="space-y-4">
      <PendingRepaymentsTable rows={rows} />
      {totalPages > 1 && (
        <Pagination safePage={safePage} totalPages={totalPages} tab="repayments" />
      )}
    </div>
  );
}

async function AccountsTab({
  page,
  statusFilter,
}: {
  page: number;
  statusFilter?: string;
}) {
  const { rows, total } = await getAllCreditAccounts({
    page,
    pageSize: PAGE_SIZE,
    statusFilter,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const filterOptions = [
    { value: "", label: "All" },
    { value: "APPROVED", label: "Approved" },
    { value: "PENDING", label: "Pending" },
    { value: "SUSPENDED", label: "Suspended" },
    { value: "NONE", label: "None" },
    { value: "CLOSED", label: "Closed" },
  ];

  return (
    <div className="space-y-4">
      {/* Status filter links */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => (
          <Link
            key={opt.value}
            href={`/employee/credit?tab=accounts${opt.value ? `&status=${opt.value}` : ""}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              (statusFilter ?? "") === opt.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          No accounts found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Limit</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3 text-right">Available</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id} className="bg-white hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{row.user.name ?? "—"}</p>
                    <p className="text-xs text-gray-500">{row.user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {STATUS_LABELS[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{formatPaise(row.limitInPaise)}</td>
                  <td className="px-4 py-3 text-right text-orange-600">
                    {formatPaise(row.outstandingInPaise)}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    {formatPaise(row.availableInPaise)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/employee/credit/account/${row.userId}`}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        View Details
                      </Link>
                      <AccountActionButtons userId={row.userId} status={row.status} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          safePage={safePage}
          totalPages={totalPages}
          tab="accounts"
          extraParam={statusFilter ? `&status=${statusFilter}` : ""}
        />
      )}
      <p className="text-sm text-gray-500">{total} total accounts</p>
    </div>
  );
}

function Pagination({
  safePage,
  totalPages,
  tab,
  extraParam = "",
}: {
  safePage: number;
  totalPages: number;
  tab: string;
  extraParam?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm text-gray-600">
      <span>
        Page {safePage} of {totalPages}
      </span>
      <div className="flex gap-2">
        {safePage > 1 && (
          <Link
            href={`/employee/credit?tab=${tab}${extraParam}&page=${safePage - 1}`}
            className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
          >
            Previous
          </Link>
        )}
        {safePage < totalPages && (
          <Link
            href={`/employee/credit?tab=${tab}${extraParam}&page=${safePage + 1}`}
            className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
