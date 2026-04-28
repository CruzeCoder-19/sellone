import Link from "next/link";
import { requireRoles } from "@/lib/auth/helpers";
import { getAuditLogs } from "@/server/queries/admin.queries";
import { AuditLogRow } from "@/components/admin/AuditLogRow";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Audit Log — Wolsell Admin" };

const ENTITY_OPTIONS = [
  "User", "Order", "Shop", "CreditAccount", "CreditApplication", "CreditTransaction",
];

const PAGE_SIZE = 25;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entity?: string; actor?: string }>;
}) {
  await requireRoles("ADMIN");
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const entityFilter = params.entity?.trim() || undefined;
  const actorSearch = params.actor?.trim() || undefined;

  const { rows, total } = await getAuditLogs({ page, pageSize: PAGE_SIZE, entityFilter, actorSearch });
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const qs = `${entityFilter ? `&entity=${entityFilter}` : ""}${actorSearch ? `&actor=${actorSearch}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Audit Log</h1>
        <span className="text-sm text-gray-500">{total} entries</span>
      </div>

      {/* Filters */}
      <form method="get" className="flex flex-wrap gap-2">
        <select
          name="entity"
          defaultValue={entityFilter ?? ""}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Entities</option>
          {ENTITY_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <input
          name="actor"
          defaultValue={actorSearch}
          placeholder="Actor name / email…"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button type="submit" className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
          Filter
        </button>
        <Link href="/admin/audit-log" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
          Clear
        </Link>
      </form>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Actor</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Entity</th>
              <th className="px-4 py-3 text-left">Entity ID</th>
              <th className="px-4 py-3 text-left">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((log) => (
              <AuditLogRow key={log.id} log={log} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No audit log entries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={`/admin/audit-log?page=${page - 1}${qs}`}
              className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
              ← Previous
            </Link>
          )}
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={`/admin/audit-log?page=${page + 1}${qs}`}
              className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
