import Link from "next/link";
import { LayoutDashboard, Users, Trophy } from "lucide-react";
import { requireRoles } from "@/lib/auth/helpers";

export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles("SALES", "ADMIN");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav className="mb-8 flex gap-4 border-b border-gray-200 pb-4">
        <Link
          href="/sales"
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-blue-600"
        >
          <LayoutDashboard size={15} />
          Dashboard
        </Link>
        <Link
          href="/sales/leads"
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-blue-600"
        >
          <Users size={15} />
          Leads
        </Link>
        <Link
          href="/sales/leaderboard"
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-blue-600"
        >
          <Trophy size={15} />
          Leaderboard
        </Link>
      </nav>
      {children}
    </div>
  );
}
