import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth/helpers";
import { getCreditApplicationForUser } from "@/server/queries/credit.queries";
import { CreditApplicationForm } from "@/components/credit/CreditApplicationForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Apply for Wolsell Credit" };

export default async function CreditApplyPage() {
  const user = await requireRoles("CUSTOMER");

  const latestApp = await getCreditApplicationForUser(user.id);

  // If there's already a pending application, redirect back to the status page
  if (latestApp?.status === "PENDING") {
    redirect("/customer/credit");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Apply for Wolsell Credit</h1>
        <p className="mt-1 text-sm text-gray-500">
          Complete the form below. Your application will be reviewed within 1–2 business days.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <CreditApplicationForm />
      </div>
    </div>
  );
}
