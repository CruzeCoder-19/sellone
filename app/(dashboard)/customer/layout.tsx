import Link from "next/link";
import { requireUser } from "@/lib/auth/helpers";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // requireUser redirects to /login if unauthenticated
  await requireUser();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <nav className="mb-8 flex gap-4 border-b border-gray-200 pb-4">
        <Link
          href="/customer/orders"
          className="text-sm font-semibold text-gray-700 hover:text-blue-600"
        >
          My Orders
        </Link>
      </nav>
      {children}
    </div>
  );
}
