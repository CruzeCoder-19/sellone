import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Store,
  FolderTree,
  Tag,
  Ticket,
  Trophy,
  ScrollText,
  Shield,
} from "lucide-react";
import { requireRoles } from "@/lib/auth/helpers";

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/shops", label: "Shops", icon: Store },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/brands", label: "Brands", icon: Tag },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/employee/credit", label: "Credit Mgmt", icon: Shield },
];

const linkCls =
  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles("ADMIN");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Mobile top nav */}
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-gray-200 pb-4 sm:hidden">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Icon size={12} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-44 shrink-0 sm:block">
          <nav className="space-y-0.5">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={linkCls}>
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
