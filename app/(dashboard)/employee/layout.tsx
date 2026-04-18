import Link from "next/link";
import { Shield } from "lucide-react";
import { requireRoles } from "@/lib/auth/helpers";
import { getPendingCounts } from "@/server/queries/credit-admin.queries";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles("EMPLOYEE", "ADMIN");

  const counts = await getPendingCounts();
  const hasPending = counts.applications + counts.repayments > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav className="mb-8 flex gap-4 border-b border-gray-200 pb-4">
        <Link
          href="/employee/credit"
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-blue-600"
        >
          <Shield size={15} />
          Credit Management
          {hasPending && (
            <span className="h-2 w-2 rounded-full bg-orange-500" />
          )}
        </Link>
      </nav>
      {children}
    </div>
  );
}
