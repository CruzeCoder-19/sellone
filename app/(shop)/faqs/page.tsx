import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQs — Wolsell",
  description: "Frequently asked questions about Wolsell, Wolsell Credit, orders, and more.",
};

const FAQS = [
  {
    q: "What is Wolsell?",
    a: "Wolsell is India's B2B wholesale marketplace that connects manufacturers and distributors with retail businesses. You can browse thousands of products, place bulk orders, and pay via prepaid or Wolsell Credit.",
  },
  {
    q: "How does Wolsell Credit work?",
    a: "Wolsell Credit is a buy-now, pay-later facility for verified business buyers. Once approved, you receive a credit limit and can place orders without immediate payment. Your outstanding balance is settled according to the agreed repayment cycle. Apply from your account dashboard.",
  },
  {
    q: "What is the minimum order quantity (MOQ)?",
    a: "MOQ varies by product and is set by the seller. Each product listing clearly displays its MOQ. Some products have a MOQ of 1, while others — typically bulk categories — may require orders of 10, 50, or more units.",
  },
  {
    q: "How do I become a seller on Wolsell?",
    a: (
      <span>
        Visit our{" "}
        <Link href="/sell-with-us" className="text-blue-600 hover:underline">
          Become a Seller
        </Link>{" "}
        page and submit your application. Once approved, you&rsquo;ll get access to your seller dashboard to list products and manage orders.
      </span>
    ),
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept Prepaid payments (UPI, netbanking, cards) and Wolsell Credit for verified business buyers.",
  },
  {
    q: "How do I track my order?",
    a: (
      <span>
        You can track your order at any time via our{" "}
        <Link href="/track-order" className="text-blue-600 hover:underline">
          Order Tracking
        </Link>{" "}
        page. You&rsquo;ll also receive status updates as your order moves through our fulfilment process.
      </span>
    ),
  },
  {
    q: "Do you deliver pan-India?",
    a: "Yes, Wolsell ships to all major cities and states across India. Delivery timelines vary by location and product — typically 3–7 business days for standard orders.",
  },
  {
    q: "What is your return policy?",
    a: "We offer a 14-day return window on eligible products from the date of delivery, subject to condition. Damaged or defective items are replaced at no additional cost. See our Delivery & Returns page for full details.",
  },
  {
    q: "I'm a manufacturer. Can I list my products directly?",
    a: "Absolutely. Wolsell welcomes manufacturers, brands, and authorised distributors. Apply through the seller onboarding process and our team will review your application within 2–3 business days.",
  },
];

export default function FaqsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-3 text-3xl font-bold text-gray-900">Frequently Asked Questions</h1>
      <p className="mb-10 text-gray-500">
        Can&rsquo;t find your answer?{" "}
        <Link href="/contact" className="text-blue-600 hover:underline">
          Contact us
        </Link>
        .
      </p>

      <div className="space-y-3">
        {FAQS.map((faq, i) => (
          <details
            key={i}
            className="group rounded-xl border border-gray-200 bg-white shadow-sm"
          >
            <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-gray-900 marker:content-none">
              {faq.q}
              <span className="ml-4 flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="border-t border-gray-100 px-5 py-4 text-sm text-gray-600 leading-relaxed">
              {typeof faq.a === "string" ? <p>{faq.a}</p> : <p>{faq.a}</p>}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
