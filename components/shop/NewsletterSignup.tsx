"use client";

import { useState } from "react";
import { toast } from "sonner";
import { subscribeNewsletter } from "@/server/actions/newsletter.actions";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const result = await subscribeNewsletter({ email });
    setSubmitting(false);
    if (result.ok) {
      toast.success("You're subscribed!");
      setEmail("");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email address"
        required
        className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
      >
        {submitting ? "…" : "Subscribe"}
      </button>
    </form>
  );
}
