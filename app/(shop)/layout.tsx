import Link from "next/link";
import { Package } from "lucide-react";
import { SearchInput } from "@/components/shop/SearchInput";
import { HeaderIcons } from "@/components/shop/HeaderIcons";
import { Toaster } from "@/components/ui/sonner";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-gray-900 hover:text-blue-600"
          >
            <Package className="h-6 w-6 text-blue-600" />
            Wolsell
          </Link>

          {/* Nav links */}
          <nav className="hidden items-center gap-5 text-sm font-medium text-gray-600 md:flex">
            <Link href="/shop" className="hover:text-gray-900">
              Shop
            </Link>
          </nav>

          {/* Search — grows to fill */}
          <div className="flex flex-1 justify-center px-4">
            <SearchInput />
          </div>

          {/* Right icons — wishlist + cart (live counts) + login/account */}
          <HeaderIcons />
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1">{children}</main>

      <Toaster />

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-900">Shop</p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>
                  <Link href="/shop" className="hover:text-gray-900">
                    All products
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-gray-900">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-900">Support</p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>
                  <Link href="/faqs" className="hover:text-gray-900">
                    FAQs
                  </Link>
                </li>
                <li>
                  <Link href="/delivery-return" className="hover:text-gray-900">
                    Delivery &amp; Returns
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-gray-900">
                    Contact us
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-900">Company</p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>
                  <Link href="/about" className="hover:text-gray-900">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/sell-with-us" className="hover:text-gray-900">
                    Become a seller
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-gray-900">Wolsell</p>
              <p className="text-sm text-gray-500">
                Wholesale supplies, simplified.
              </p>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Wolsell. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
