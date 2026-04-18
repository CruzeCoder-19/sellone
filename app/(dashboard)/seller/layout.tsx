import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, Package, ShoppingBag } from "lucide-react";
import { requireRoles } from "@/lib/auth/helpers";
import { getShopForUser } from "@/server/queries/seller.queries";

function PendingBanner() {
  return (
    <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
      <strong>Shop under review.</strong> Your application is being processed. Some features
      are restricted until your shop is approved.
    </div>
  );
}

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRoles("SELLER");

  const shop = await getShopForUser(user.id);
  if (!shop) redirect("/sell-with-us/apply");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {shop.status === "PENDING" && <PendingBanner />}

      <nav className="mb-8 flex gap-4 border-b border-gray-200 pb-4">
        <Link
          href="/seller"
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-blue-600"
        >
          <LayoutDashboard size={15} />
          Dashboard
        </Link>
        <Link
          href="/seller/products"
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-blue-600"
        >
          <Package size={15} />
          Products
        </Link>
        <Link
          href="/seller/orders"
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-blue-600"
        >
          <ShoppingBag size={15} />
          Orders
        </Link>
      </nav>

      {children}
    </div>
  );
}
