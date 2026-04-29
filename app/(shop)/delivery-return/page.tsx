import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delivery & Returns — Wolsell",
  description: "Wolsell delivery policy and return & refund information.",
};

export default function DeliveryReturnPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-10 text-3xl font-bold text-gray-900">Delivery &amp; Returns</h1>

      {/* Delivery Policy */}
      <section className="mb-12">
        <h2 className="mb-5 text-xl font-semibold text-gray-900">Delivery Policy</h2>
        <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
          <h3 className="font-semibold text-gray-800">Estimated Delivery Times</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Metro cities (Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Pune): <strong>2–4 business days</strong></li>
            <li>Tier 2 &amp; Tier 3 cities: <strong>4–7 business days</strong></li>
            <li>Remote areas: <strong>7–12 business days</strong></li>
          </ul>

          <h3 className="font-semibold text-gray-800">Shipping Charges</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Orders above ₹5,000: <strong>Free shipping</strong></li>
            <li>Orders below ₹5,000: Flat ₹99 shipping fee</li>
            <li>Bulky or heavy items may carry additional freight charges displayed at checkout.</li>
          </ul>

          <h3 className="font-semibold text-gray-800">Bulk Order Shipping</h3>
          <p>
            For large-volume orders, our logistics team may reach out to coordinate customised
            freight arrangements, including pallet delivery and warehouse drop options. Contact
            us at <a href="mailto:logistics@wolsell.com" className="text-blue-600 hover:underline">logistics@wolsell.com</a> for
            dedicated freight quotes.
          </p>

          <h3 className="font-semibold text-gray-800">Order Tracking</h3>
          <p>
            Once your order is dispatched, you will receive a tracking number. You can check
            order status at any time from your account dashboard or via our{" "}
            <a href="/track-order" className="text-blue-600 hover:underline">
              Order Tracking
            </a>{" "}
            page.
          </p>
        </div>
      </section>

      <hr className="border-gray-200" />

      {/* Return & Refund Policy */}
      <section className="mt-12">
        <h2 className="mb-5 text-xl font-semibold text-gray-900">Return &amp; Refund Policy</h2>
        <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
          <h3 className="font-semibold text-gray-800">Return Window</h3>
          <p>
            You may request a return within <strong>14 days</strong> of delivery for eligible
            products. The item must be unused, in original packaging, and accompanied by proof
            of purchase.
          </p>

          <h3 className="font-semibold text-gray-800">Eligible Return Conditions</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Item received in damaged or defective condition</li>
            <li>Wrong item delivered</li>
            <li>Item significantly different from the product listing</li>
          </ul>

          <h3 className="font-semibold text-gray-800">Non-Returnable Items</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Perishable goods or items with hygiene seals broken</li>
            <li>Custom or made-to-order products</li>
            <li>Items marked "non-returnable" on the product listing</li>
          </ul>

          <h3 className="font-semibold text-gray-800">Return Process</h3>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Initiate a return request from your account → Orders page within 14 days.</li>
            <li>Our team will review and approve within 2 business days.</li>
            <li>Schedule a pickup or drop the item at the nearest courier point.</li>
            <li>Refund is processed within <strong>5–7 business days</strong> after we receive and inspect the item.</li>
          </ol>

          <h3 className="font-semibold text-gray-800">Refund Method</h3>
          <p>
            Refunds are credited back to the original payment method. Wolsell Credit purchases
            are refunded to your Wolsell Credit balance.
          </p>

          <p className="mt-4">
            For any return-related queries, email us at{" "}
            <a href="mailto:returns@wolsell.com" className="text-blue-600 hover:underline">
              returns@wolsell.com
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
