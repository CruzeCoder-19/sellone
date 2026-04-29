"use client";

import { useState } from "react";
import { toast } from "sonner";
import { submitContactForm } from "@/server/actions/contact.actions";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const result = await submitContactForm({
      name, email, phone: phone || undefined, message,
    });
    setSubmitting(false);
    if (result.ok) {
      toast.success("Message sent! We'll get back to you soon.");
      setName(""); setEmail(""); setPhone(""); setMessage("");
    } else {
      toast.error(result.error);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Name <span className="text-red-500">*</span></label>
        <input type="text" className={inputCls} value={name}
          onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className={labelCls}>Email <span className="text-red-500">*</span></label>
        <input type="email" className={inputCls} value={email}
          onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label className={labelCls}>Phone</label>
        <input type="tel" className={inputCls} value={phone}
          onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
      </div>
      <div>
        <label className={labelCls}>Message <span className="text-red-500">*</span></label>
        <textarea rows={5} className={inputCls} value={message}
          onChange={(e) => setMessage(e.target.value)} required
          placeholder="Tell us how we can help…" />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
