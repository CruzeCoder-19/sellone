import { requireRoles } from "@/lib/auth/helpers";
import { getEmployeeProfile, getTodayCheckIn, getCheckIns } from "@/server/queries/employee.queries";
import { EmployeeSetupForm } from "@/components/employee/EmployeeSetupForm";
import { CheckInOutButtons } from "@/components/employee/CheckInOutButtons";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Employee Dashboard — Wolsell" };

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

export default async function EmployeeDashboard() {
  const user = await requireRoles("EMPLOYEE", "ADMIN");
  const profile = await getEmployeeProfile(user.id);

  // No profile → show setup form
  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Employee Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Complete your profile setup to get started.
          </p>
        </div>
        <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">Set Up Your Profile</h2>
          <EmployeeSetupForm />
        </div>
      </div>
    );
  }

  const [todayCheckIn, recentCheckIns] = await Promise.all([
    getTodayCheckIn(profile.id),
    getCheckIns(profile.id, { page: 1, pageSize: 5 }),
  ]);

  const isCheckedIn = todayCheckIn !== null && todayCheckIn.checkOutAt === null;
  const isCheckedOut = todayCheckIn !== null && todayCheckIn.checkOutAt !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Employee Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back, {user.name ?? "Employee"}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Profile card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Profile
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Employee Code</dt>
              <dd className="font-mono font-medium">{profile.employeeCode}</dd>
            </div>
            {profile.department && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Department</dt>
                <dd className="font-medium">{profile.department}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Joined</dt>
              <dd className="font-medium">
                {new Date(profile.joinedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
          </dl>
        </div>

        {/* Check-in card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Today&apos;s Attendance
          </h2>

          {!todayCheckIn && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">You haven&apos;t checked in today.</p>
              <CheckInOutButtons mode="check-in" />
            </div>
          )}

          {isCheckedIn && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Checked in at{" "}
                <span className="font-semibold">{formatTime(todayCheckIn.checkInAt)}</span>
              </p>
              <CheckInOutButtons mode="check-out" />
            </div>
          )}

          {isCheckedOut && (
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                Checked in at{" "}
                <span className="font-semibold">{formatTime(todayCheckIn.checkInAt)}</span>
              </p>
              <p>
                Checked out at{" "}
                <span className="font-semibold">{formatTime(todayCheckIn.checkOutAt!)}</span>
              </p>
              <p className="text-xs text-gray-500">
                Duration:{" "}
                {formatDuration(todayCheckIn.checkInAt, todayCheckIn.checkOutAt)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      {recentCheckIns.rows.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent Activity</h2>
            <a
              href="/employee/attendance"
              className="text-xs text-blue-600 hover:underline"
            >
              View all →
            </a>
          </div>
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
              {recentCheckIns.rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-3 text-gray-700">
                    {new Date(row.checkInAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3">{formatTime(row.checkInAt)}</td>
                  <td className="px-5 py-3">
                    {row.checkOutAt ? formatTime(row.checkOutAt) : "—"}
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
    </div>
  );
}
