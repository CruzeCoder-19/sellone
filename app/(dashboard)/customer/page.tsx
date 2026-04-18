import { requireUser } from "@/lib/auth/helpers";
import { CreditSummaryWidget } from "@/components/credit/CreditSummaryWidget";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard — Wolsell" };

export default async function CustomerDashboard() {
  await requireUser();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CreditSummaryWidget />
      </div>
    </div>
  );
}
