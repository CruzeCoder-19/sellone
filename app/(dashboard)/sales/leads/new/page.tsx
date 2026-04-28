import { requireRoles } from "@/lib/auth/helpers";
import { LeadForm } from "@/components/sales/LeadForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Add Lead — Wolsell Sales" };

export default async function NewLeadPage() {
  await requireRoles("SALES", "ADMIN");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Add Lead</h1>
        <p className="mt-1 text-sm text-gray-500">Create a new sales lead.</p>
      </div>
      <LeadForm mode="create" />
    </div>
  );
}
