import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Wolsell — India's B2B Wholesale Marketplace",
  description:
    "Learn about Wolsell, India's trusted wholesale marketplace connecting manufacturers and distributors with retail businesses.",
};

const BENEFITS = [
  {
    title: "Bulk Pricing",
    description:
      "Tiered pricing ensures the more you buy, the more you save. Prices adjust automatically based on your order quantity.",
  },
  {
    title: "Wolsell Credit",
    description:
      "Buy now, pay on delivery with Wolsell Credit — a flexible BNPL facility for verified business buyers.",
  },
  {
    title: "Easy Returns",
    description:
      "14-day hassle-free return window on eligible products. We stand behind the quality of every item on our platform.",
  },
  {
    title: "Verified Suppliers",
    description:
      "Every seller undergoes identity and business verification before they can list products. Shop with confidence.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-4xl font-bold text-gray-900">About Wolsell</h1>

      <div className="space-y-5 text-lg text-gray-600 leading-relaxed">
        <p>
          Wolsell is India&rsquo;s trusted B2B wholesale marketplace, connecting manufacturers
          and distributors with retail businesses across the country. We believe procurement
          should be simple, transparent, and accessible — whether you run a neighbourhood store
          or a large retail chain.
        </p>
        <p>
          Founded with the mission to digitise India&rsquo;s wholesale supply chain, Wolsell
          gives buyers access to thousands of products across hardware, electrical, kitchen,
          sanitary, apparel, and more — all sourced from verified sellers at competitive
          bulk prices.
        </p>
        <p>
          Our platform introduces{" "}
          <strong className="text-gray-900">Wolsell Credit</strong> — a built-in buy-now,
          pay-later facility that lets verified businesses purchase inventory without upfront
          cash outflow, with repayment aligned to their order delivery cycle.
        </p>
        <p>
          For sellers, Wolsell provides a simple portal to list products, manage inventory,
          and fulfil orders — reaching thousands of wholesale buyers without the overhead of
          a physical distribution network.
        </p>
      </div>

      {/* Benefits */}
      <div className="mt-14">
        <h2 className="mb-8 text-2xl font-bold text-gray-900">Why choose Wolsell?</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-base font-semibold text-gray-900">{b.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
