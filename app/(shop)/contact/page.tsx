import { ContactForm } from "@/components/shop/ContactForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us — Wolsell",
  description: "Get in touch with the Wolsell team. We're here to help.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="mb-10 text-3xl font-bold text-gray-900">Contact Us</h1>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Contact info */}
        <div className="space-y-8">
          <div>
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Get in touch</h2>
            <p className="text-gray-600 leading-relaxed">
              Have a question about an order, need help setting up your seller account, or want
              to learn more about Wolsell Credit? Our team is here to help.
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold">
                📍
              </div>
              <div>
                <p className="font-medium text-gray-900">Office Address</p>
                <p className="mt-1 text-sm text-gray-500">
                  123 Trade Centre, Andheri East<br />
                  Mumbai, Maharashtra 400069<br />
                  India
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold">
                ✉️
              </div>
              <div>
                <p className="font-medium text-gray-900">Email</p>
                <a href="mailto:support@wolsell.com" className="mt-1 text-sm text-blue-600 hover:underline">
                  support@wolsell.com
                </a>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold">
                📞
              </div>
              <div>
                <p className="font-medium text-gray-900">Phone</p>
                <p className="mt-1 text-sm text-gray-500">+91 98765 00000</p>
                <p className="text-xs text-gray-400">Mon–Sat, 10 AM – 6 PM IST</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact form */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-gray-900">Send us a message</h2>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
