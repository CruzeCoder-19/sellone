import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRoles } from "@/lib/auth/helpers";
import { getSalesProfile, getLeads } from "@/server/queries/sales.queries";
import { deleteLead } from "@/server/actions/sales.actions";
import type { Metadata } from "next";
import type { LeadStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Leads — Wolsell Sales" };

const STATUS_TABS: { label: string; value: LeadStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "New", value: "NEW" },
  { label: "Contacted", value: "CONTACTED" },
  { label: "Qualified", value: "QUALIFIED" },
  { label: "Won", value: "WON" },
  { label: "Lost", value: "LOST" },
];

const STATUS_BADGE: Record<LeadStatus, string> = {
  NEW: "bg-blue-50 text-blue-700",
  CONTACTED: "bg-yellow-50 text-yellow-700",
  QUALIFIED: "bg-purple-50 text-purple-700",
  WON: "bg-green-50 text-green-700",
  LOST: "bg-red-50 text-red-700",
};

const PAGE_SIZE = 20;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const user = await requireRoles("SALES", "ADMIN");
  const profile = await getSalesProfile(user.id);
  if (!profile) notFound();

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const statusFilter =
    STATUS_TABS.find((t) => t.value === params.status)?.value ?? "ALL";

  const { rows, total } = await getLeads(profile.id, {
    page,
    pageSize: PAGE_SIZE,
    status: statusFilter === "ALL" ? undefined : (statusFilter as LeadStatus),
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Leads</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {total} lead{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/sales/leads/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Add Lead
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.value;
          const href =
            tab.value === "ALL"
              ? "/sales/leads"
              : `/sales/leads?status=${tab.value}`;
          return (
            <Link
              key={tab.value}
              href={href}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                active
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No leads found.</p>
          <Link
            href="/sales/leads/new"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Add your first lead
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {lead.contactName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {lead.contactPhone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {lead.contactEmail ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[lead.status]}`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/sales/leads/${lead.id}/edit`}
                        className="rounded border border-gray-200 px-2.5 py-1 text-xs hover:bg-gray-50"
                      >
                        Edit
                      </Link>
                      <form
                        action={async () => {
                          "use server";
                          await deleteLead(lead.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            if (!confirm(`Delete lead "${lead.contactName}"?`)) {
                              e.preventDefault();
                            }
                          }}
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/sales/leads?page=${page - 1}${statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}`}
              className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/sales/leads?page=${page + 1}${statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}`}
              className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
