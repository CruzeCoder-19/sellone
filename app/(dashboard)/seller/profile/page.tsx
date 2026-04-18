import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth/helpers";
import { getShopForUser } from "@/server/queries/seller.queries";
import { ShopProfileEditor } from "@/components/seller/ShopProfileEditor";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Shop Profile — Wolsell" };

export default async function SellerProfilePage() {
  const user = await requireRoles("SELLER");

  const shop = await getShopForUser(user.id);
  if (!shop) redirect("/sell-with-us/apply");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Edit Shop Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update your shop details, logo, and banner image.
        </p>
      </div>

      <ShopProfileEditor shop={shop} />
    </div>
  );
}
