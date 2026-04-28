import Link from "next/link";
import { requireRoles } from "@/lib/auth/helpers";
import { getAchieverBoard } from "@/server/queries/sales.queries";
import { formatPaise } from "@/lib/format";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Leaderboard — Wolsell Sales" };

function getRecentPeriods(count: number): { label: string; value: string }[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    return { label, value };
  });
}

const PERIODS = getRecentPeriods(3);

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireRoles("SALES", "ADMIN");

  const params = await searchParams;
  const selectedPeriod =
    PERIODS.find((p) => p.value === params.period)?.value ?? PERIODS[0].value;

  const entries = await getAchieverBoard({ period: selectedPeriod, limit: 50 });

  // Assign display ranks: entries are sorted by metricInPaise desc; use DB rank if set, else position
  const ranked = entries.map((entry, idx) => ({
    ...entry,
    displayRank: entry.rank ?? idx + 1,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Leaderboard</h1>
        <p className="mt-1 text-sm text-gray-500">Top performers by sales value.</p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {PERIODS.map((p) => {
          const active = selectedPeriod === p.value;
          return (
            <Link
              key={p.value}
              href={`/sales/leaderboard?period=${p.value}`}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                active
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      {ranked.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No leaderboard data for this period.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left w-16">Rank</th>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-right">Metric</th>
                <th className="px-5 py-3 text-left">Period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ranked.map((entry) => (
                <tr
                  key={entry.id}
                  className={`hover:bg-gray-50 ${entry.displayRank <= 3 ? "font-medium" : ""}`}
                >
                  <td className="px-5 py-3">
                    {entry.displayRank === 1 ? "🥇" : entry.displayRank === 2 ? "🥈" : entry.displayRank === 3 ? "🥉" : `#${entry.displayRank}`}
                  </td>
                  <td className="px-5 py-3 text-gray-900">
                    {entry.user.name ?? entry.user.email ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-900">
                    {formatPaise(entry.metricInPaise)}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{entry.period}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
