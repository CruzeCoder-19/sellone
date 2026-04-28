import { notFound } from "next/navigation";
import { requireRoles } from "@/lib/auth/helpers";
import { getSalesProfile, getLeadById } from "@/server/queries/sales.queries";
import { LeadForm } from "@/components/sales/LeadForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Lead — Wolsell Sales" };

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const user = await requireRoles("SALES", "ADMIN");
  const profile = await getSalesProfile(user.id);
  if (!profile) notFound();

  const { leadId } = await params;
  const lead = await getLeadById(profile.id, leadId);
  if (!lead) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Edit Lead</h1>
        <p className="mt-1 text-sm text-gray-500">{lead.contactName}</p>
      </div>
      <LeadForm mode="edit" lead={lead} />
    </div>
  );
}
