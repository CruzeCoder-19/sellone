import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getShopForUser } from "@/server/queries/seller.queries";
import { SellerApplicationForm } from "@/components/seller/SellerApplicationForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Apply to Sell — Wolsell" };

export default async function ApplyPage() {
  const session = await auth();

  // Not logged in → redirect to login
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/sell-with-us/apply");
  }

  // Already has a shop → redirect to seller dashboard
  const shop = await getShopForUser(session.user.id);
  if (shop) redirect("/seller");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Link
          href="/sell-with-us"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Sell with Us
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          Apply to sell on Wolsell
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Fill in your shop details below. We&apos;ll review your application within 2 business days.
        </p>
      </div>

      <SellerApplicationForm />
    </div>
  );
}
