import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRoles } from "@/lib/auth/helpers";
import { getEmployeeProfile, getCheckIns } from "@/server/queries/employee.queries";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Attendance — Wolsell Employee" };

const PAGE_SIZE = 20;

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(checkInAt: Date, checkOutAt: Date | null): string {
  if (!checkOutAt) return "—";
  const diffMs = checkOutAt.getTime() - checkInAt.getTime();
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireRoles("EMPLOYEE", "ADMIN");
  const profile = await getEmployeeProfile(user.id);
  if (!profile) notFound();

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { rows, total } = await getCheckIns(profile.id, { page, pageSize: PAGE_SIZE });
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Attendance History</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {total} record{total !== 1 ? "s" : ""} total
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No attendance records yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Check In</th>
                <th className="px-5 py-3 text-left">Check Out</th>
                <th className="px-5 py-3 text-left">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {new Date(row.checkInAt).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3 text-gray-700">{formatTime(row.checkInAt)}</td>
                  <td className="px-5 py-3 text-gray-700">
                    {row.checkOutAt ? formatTime(row.checkOutAt) : (
                      <span className="text-green-600 font-medium">Active</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {formatDuration(row.checkInAt, row.checkOutAt)}
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
              href={`/employee/attendance?page=${page - 1}`}
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
              href={`/employee/attendance?page=${page + 1}`}
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
