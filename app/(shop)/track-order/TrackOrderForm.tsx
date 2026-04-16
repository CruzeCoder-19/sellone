"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TrackOrderForm({
  defaultOrderNumber,
  defaultEmail,
}: {
  defaultOrderNumber: string;
  defaultEmail: string;
}) {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState(defaultOrderNumber);
  const [email, setEmail] = useState(defaultEmail);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (orderNumber.trim()) params.set("orderNumber", orderNumber.trim());
    if (email.trim()) params.set("email", email.trim());
    router.push(`/track-order?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="orderNumber">Order number</Label>
          <Input
            id="orderNumber"
            placeholder="WOL-2026-000123"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>
      <Button type="submit" className="w-full sm:w-auto">
        Track order
      </Button>
    </form>
  );
}
