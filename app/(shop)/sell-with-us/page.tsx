import Link from "next/link";
import { Store, CreditCard, BarChart3 } from "lucide-react";
import { auth } from "@/auth";
import { getShopForUser } from "@/server/queries/seller.queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sell on Wolsell — Become a Seller",
  description: "Reach thousands of wholesale buyers across India. Apply to sell on Wolsell today.",
};

export default async function SellWithUsPage() {
  const session = await auth();

  let hasShop = false;
  if (session?.user?.id) {
    const shop = await getShopForUser(session.user.id);
    hasShop = !!shop;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      {/* Hero */}
      <div className="mb-14 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Sell on Wolsell
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          Reach thousands of wholesale buyers across India. Simple setup, powerful tools.
        </p>
      </div>

      {/* Benefit cards */}
      <div className="mb-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Store className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Reach wholesale buyers</h3>
          <p className="mt-2 text-sm text-gray-500">
            Your products in front of verified B2B buyers looking for reliable suppliers.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
            <CreditCard className="h-5 w-5 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Wolsell Credit integration</h3>
          <p className="mt-2 text-sm text-gray-500">
            Buyers pay with Wolsell Credit, you get paid on delivery. No collection headaches.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
            <BarChart3 className="h-5 w-5 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Simple inventory management</h3>
          <p className="mt-2 text-sm text-gray-500">
            Track stock, manage variants, and fulfil orders all in one place.
          </p>
        </div>
      </div>

      {/* CTA section */}
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        {!session ? (
          <>
            <h2 className="text-xl font-semibold text-gray-900">Ready to start selling?</h2>
            <p className="mt-2 text-sm text-gray-500">
              Create an account or log in to submit your seller application.
            </p>
            <div className="mt-6">
              <Link
                href="/login?callbackUrl=/sell-with-us/apply"
                className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Log in to apply
              </Link>
            </div>
          </>
        ) : hasShop ? (
          <>
            <h2 className="text-xl font-semibold text-gray-900">
              You already have a seller account.
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Head to your seller dashboard to manage your shop.
            </p>
            <div className="mt-6">
              <Link
                href="/seller"
                className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Go to Seller Dashboard →
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-gray-900">Start your application</h2>
            <p className="mt-2 text-sm text-gray-500">
              Takes about 5 minutes. We review all applications within 2 business days.
            </p>
            <div className="mt-6">
              <Link
                href="/sell-with-us/apply"
                className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Start your application →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
