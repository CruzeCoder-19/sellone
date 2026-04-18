import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRoles } from "@/lib/auth/helpers";
import { formatPaise } from "@/lib/format";
import { getApplicationForReview } from "@/server/queries/credit-admin.queries";
import { ReviewDecisionPanel } from "@/components/credit/ReviewDecisionPanel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Review Application — Wolsell" };

const STATUS_LABELS: Record<string, string> = {
  NONE: "None",
  PENDING: "Pending",
  APPROVED: "Approved",
  SUSPENDED: "Suspended",
  CLOSED: "Closed / Rejected",
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
  params: Promise<{ applicationId: string }>;
};

export default async function ReviewApplicationPage({ params }: Props) {
  await requireRoles("EMPLOYEE", "ADMIN");

  const { applicationId } = await params;
  const app = await getApplicationForReview(applicationId);
  if (!app) notFound();

  // Only allow reviewing PENDING applications
  const isPending = app.status === "PENDING";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Review Credit Application</h1>
        <Link href="/employee/credit" className="text-sm text-blue-600 hover:underline">
          ← Back to Credit Management
        </Link>
      </div>

      {/* Applicant info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Applicant Information</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Name</dt>
            <dd className="mt-1 text-gray-900">{app.user.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Email</dt>
            <dd className="mt-1 text-gray-900">{app.user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Phone</dt>
            <dd className="mt-1 text-gray-900">{app.user.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Legal Name</dt>
            <dd className="mt-1 text-gray-900">{app.legalName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">PAN</dt>
            <dd className="mt-1 font-mono text-gray-900">{maskPan(app.panNumber)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">GSTIN</dt>
            <dd className="mt-1 font-mono text-gray-900">{app.gstin ?? "—"}</dd>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-xs font-medium uppercase text-gray-500">Business Address</dt>
            <dd className="mt-1 text-gray-900">{app.businessAddress}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Monthly Turnover</dt>
            <dd className="mt-1 text-gray-900">
              {app.monthlyTurnoverInPaise != null
                ? formatPaise(app.monthlyTurnoverInPaise)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Submitted</dt>
            <dd className="mt-1 text-gray-900">
              {new Date(app.submittedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Status</dt>
            <dd className="mt-1">
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[app.status] ?? "bg-gray-100 text-gray-600"}`}
              >
                {STATUS_LABELS[app.status] ?? app.status}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {/* KYC Documents */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">KYC Documents</h2>
        {app.kycAssets.length === 0 ? (
          <p className="text-sm text-gray-500">No documents uploaded.</p>
        ) : (
          <ul className="space-y-2">
            {app.kycAssets.map(({ asset }) => {
              const filename = asset.key.split("/").pop() ?? asset.key;
              const url = `/api/blobs/${asset.store}/${asset.key}`;
              return (
                <li key={asset.id}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <span>📄</span>
                    <span className="font-mono">{filename}</span>
                    <span className="text-xs text-gray-400">({asset.contentType})</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Previous applications */}
      {app.pastApplications.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Previous Applications</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Outcome</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {app.pastApplications.map((past) => (
                  <tr key={past.id} className="bg-white">
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(past.submittedAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[past.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {STATUS_LABELS[past.status] ?? past.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {past.rejectionReason ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Decision panel — only for pending applications */}
      {isPending ? (
        <ReviewDecisionPanel
          applicationId={app.id}
          monthlyTurnoverInPaise={app.monthlyTurnoverInPaise ?? null}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
          This application has already been reviewed (status: {STATUS_LABELS[app.status] ?? app.status}).
        </div>
      )}
    </div>
  );
}
