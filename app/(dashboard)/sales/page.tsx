import Link from "next/link";
import { requireRoles } from "@/lib/auth/helpers";
import { getSalesProfile, getSalesStats } from "@/server/queries/sales.queries";
import { SalesSetupForm } from "@/components/sales/SalesSetupForm";
import { formatPaise } from "@/lib/format";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sales Dashboard — Wolsell" };

export default async function SalesDashboard() {
  const user = await requireRoles("SALES", "ADMIN");
  const profile = await getSalesProfile(user.id);

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Sales Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Complete your profile setup to get started.
          </p>
        </div>
        <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Set Up Your Profile</h2>
          <SalesSetupForm />
        </div>
      </div>
    );
  }

  const stats = await getSalesStats(profile.id);

  const targetSet = profile.monthlyTargetInPaise > 0;
  const progressPct = targetSet
    ? Math.min(100, Math.round((stats.wonValueInPaise / profile.monthlyTargetInPaise) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sales Dashboard</h1>
          {profile.region && (
            <p className="mt-0.5 text-sm text-gray-500">Region: {profile.region}</p>
          )}
        </div>
        <Link
          href="/sales/leads/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Add Lead
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Leads", value: stats.totalLeads, color: "text-gray-900" },
          { label: "Active Leads", value: stats.activeLeads, color: "text-blue-700" },
          { label: "Won", value: stats.wonLeads, color: "text-green-700" },
          { label: "Lost", value: stats.lostLeads, color: "text-red-700" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {card.label}
            </p>
            <p className={`mt-2 text-2xl font-semibold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly target card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Monthly Target</h2>
        {!targetSet ? (
          <p className="text-sm text-gray-500">No target set — contact admin.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Achieved: <span className="font-semibold text-gray-900">{formatPaise(stats.wonValueInPaise)}</span>
              </span>
              <span className="text-gray-600">
                Target: <span className="font-semibold text-gray-900">{formatPaise(profile.monthlyTargetInPaise)}</span>
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{progressPct}% of monthly target achieved</p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link
          href="/sales/leads"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          View All Leads →
        </Link>
        <Link
          href="/sales/leaderboard"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Leaderboard →
        </Link>
      </div>
    </div>
  );
}
