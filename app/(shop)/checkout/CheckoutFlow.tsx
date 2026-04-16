"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { placeOrder } from "@/server/actions/checkout.actions";
import { createAddress } from "@/server/actions/address.actions";
import { formatPaise } from "@/lib/format";
import { getPublicAssetUrl } from "@/lib/blobs/url";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CheckoutSummary } from "@/server/actions/checkout.actions";
import type { Address } from "@prisma/client";

type Step = 1 | 2 | 3;
type PaymentMethod = "PREPAID" | "WOLSELL_CREDIT";

interface CheckoutFlowProps {
  initialData: CheckoutSummary;
}

export function CheckoutFlow({ initialData }: CheckoutFlowProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [step, setStep] = useState<Step>(1);
  const [addresses, setAddresses] = useState<Address[]>(initialData.addresses);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    initialData.addresses.find((a) => a.isDefault)?.id ??
      initialData.addresses[0]?.id ??
      null,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("WOLSELL_CREDIT");
  const [orderError, setOrderError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    phone: "",
    isDefault: false,
  });
  const [addressError, setAddressError] = useState<string | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);

  const { cart, creditAccount, canPayCredit } = initialData;
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null;

  // ── Address form submit ──────────────────────────────────────────────────
  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    setAddressError(null);
    setSavingAddress(true);
    try {
      const result = await createAddress({
        label: addressForm.label,
        line1: addressForm.line1,
        line2: addressForm.line2 || undefined,
        city: addressForm.city,
        state: addressForm.state,
        postalCode: addressForm.postalCode,
        phone: addressForm.phone,
        isDefault: addressForm.isDefault,
      });
      if (!result.ok) {
        setAddressError(result.error);
        return;
      }
      // Re-fetch addresses — reload page data via router.refresh()
      // For now, optimistically add the new address by re-fetching summary
      // We'll trigger a soft refresh by adding a placeholder and calling router.refresh
      toast.success("Address saved");
      setShowAddressDialog(false);
      // Re-fetch by re-loading checkout summary via a simple window refresh of addresses
      // Instead, we ask the server for updated addresses via a Server Action
      const { listAddressesAction } = await import("./checkoutHelpers");
      const updated = await listAddressesAction();
      if (updated.ok) {
        setAddresses(updated.data);
        if (result.data) setSelectedAddressId(result.data.id);
      }
    } finally {
      setSavingAddress(false);
    }
  }

  // ── Place order ──────────────────────────────────────────────────────────
  async function handlePlaceOrder() {
    if (!selectedAddressId) return;
    setOrderError(null);
    setPlacing(true);
    try {
      const result = await placeOrder({ addressId: selectedAddressId, paymentMethod });
      if (!result.ok) {
        setOrderError(result.error);
        return;
      }
      // Invalidate cart caches
      queryClient.invalidateQueries({ queryKey: ["cart", userId] });
      queryClient.invalidateQueries({ queryKey: ["cart-counts"] });
      router.push(`/checkout/confirmation/${result.data.orderNumber}`);
    } finally {
      setPlacing(false);
    }
  }

  // ── Step indicators ──────────────────────────────────────────────────────
  const steps = ["Address", "Payment", "Review"];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Checkout</h1>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((label, i) => {
          const s = (i + 1) as Step;
          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  step === s
                    ? "bg-blue-600 text-white"
                    : step > s
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {step > s ? "✓" : s}
              </div>
              <span
                className={`text-sm ${step === s ? "font-semibold text-gray-900" : "text-gray-500"}`}
              >
                {label}
              </span>
              {i < steps.length - 1 && (
                <div className="mx-2 h-px w-8 bg-gray-200" />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main panel */}
        <div className="lg:col-span-2">
          {/* ── STEP 1: Address ────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Delivery address</h2>

              {addresses.length === 0 && (
                <p className="text-sm text-gray-500">
                  No saved addresses. Add one below.
                </p>
              )}

              {/* Address radio cards */}
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      selectedAddressId === addr.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{addr.label}</p>
                        <p className="mt-0.5 text-sm text-gray-600">{addr.line1}</p>
                        {addr.line2 && (
                          <p className="text-sm text-gray-600">{addr.line2}</p>
                        )}
                        <p className="text-sm text-gray-600">
                          {addr.city}, {addr.state} — {addr.postalCode}
                        </p>
                        <p className="text-sm text-gray-600">{addr.phone}</p>
                      </div>
                      <div
                        className={`mt-1 h-4 w-4 rounded-full border-2 ${
                          selectedAddressId === addr.id
                            ? "border-blue-600 bg-blue-600"
                            : "border-gray-300"
                        }`}
                      />
                    </div>
                  </button>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddressDialog(true)}
              >
                + Add new address
              </Button>

              <div className="pt-2">
                <Button
                  disabled={!selectedAddressId}
                  onClick={() => setStep(2)}
                  size="lg"
                >
                  Continue to payment
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Payment ────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Payment method</h2>

              {/* WOLSELL_CREDIT card */}
              <button
                type="button"
                disabled={!canPayCredit}
                onClick={() => canPayCredit && setPaymentMethod("WOLSELL_CREDIT")}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  !canPayCredit
                    ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                    : paymentMethod === "WOLSELL_CREDIT"
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">Pay later (Wolsell Credit)</p>
                    {creditAccount ? (
                      <>
                        <p className="mt-0.5 text-sm text-gray-600">
                          Available: {formatPaise(creditAccount.availableInPaise)} of{" "}
                          {formatPaise(creditAccount.limitInPaise)} limit
                        </p>
                        {canPayCredit ? (
                          <p className="text-sm text-blue-600">
                            This order will use {formatPaise(cart.subtotalInPaise)} of
                            your limit
                          </p>
                        ) : creditAccount.status !== "APPROVED" ? (
                          <p className="text-sm text-red-600">Credit not approved</p>
                        ) : (
                          <p className="text-sm text-red-600">
                            Insufficient credit limit (need{" "}
                            {formatPaise(cart.subtotalInPaise)}, have{" "}
                            {formatPaise(creditAccount.availableInPaise)})
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mt-0.5 text-sm text-gray-500">
                        No credit account
                      </p>
                    )}
                  </div>
                  <div
                    className={`mt-1 h-4 w-4 rounded-full border-2 ${
                      paymentMethod === "WOLSELL_CREDIT" && canPayCredit
                        ? "border-blue-600 bg-blue-600"
                        : "border-gray-300"
                    }`}
                  />
                </div>
              </button>

              {/* PREPAID card */}
              <button
                type="button"
                onClick={() => setPaymentMethod("PREPAID")}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  paymentMethod === "PREPAID"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      Pay now (Prepaid)
                    </p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      Razorpay integration coming soon — stub provider used for
                      testing
                    </p>
                  </div>
                  <div
                    className={`mt-1 h-4 w-4 rounded-full border-2 ${
                      paymentMethod === "PREPAID"
                        ? "border-blue-600 bg-blue-600"
                        : "border-gray-300"
                    }`}
                  />
                </div>
              </button>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button size="lg" onClick={() => setStep(3)}>
                  Continue to review
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Review ─────────────────────────────────────────── */}
          {step === 3 && selectedAddress && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900">Review your order</h2>

              {/* Address summary */}
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Delivery to
                </p>
                <p className="font-semibold text-gray-900">{selectedAddress.label}</p>
                <p className="text-sm text-gray-600">{selectedAddress.line1}</p>
                {selectedAddress.line2 && (
                  <p className="text-sm text-gray-600">{selectedAddress.line2}</p>
                )}
                <p className="text-sm text-gray-600">
                  {selectedAddress.city}, {selectedAddress.state} —{" "}
                  {selectedAddress.postalCode}
                </p>
                <p className="text-sm text-gray-600">{selectedAddress.phone}</p>
              </div>

              {/* Payment summary */}
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Payment
                </p>
                <p className="font-semibold text-gray-900">
                  {paymentMethod === "WOLSELL_CREDIT"
                    ? "Wolsell Credit"
                    : "Prepaid (Stub)"}
                </p>
              </div>

              {/* Line items */}
              <div className="rounded-lg border border-gray-200 bg-white">
                {cart.items.map((item) => {
                  const imageSrc = item.primaryImage
                    ? getPublicAssetUrl(item.primaryImage)
                    : "/placeholder.svg";
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 border-b border-gray-100 p-4 last:border-b-0"
                    >
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                        <Image
                          src={imageSrc}
                          alt={item.productName}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {item.productName}
                        </p>
                        {item.variantName && (
                          <p className="text-xs text-gray-500">{item.variantName}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {item.quantity} × {formatPaise(item.unitPriceInPaise)}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        {formatPaise(item.lineTotalInPaise)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Error banner */}
              {orderError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {orderError}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOrderError(null);
                    setStep(2);
                  }}
                >
                  Back
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  disabled={placing}
                  onClick={handlePlaceOrder}
                >
                  {placing ? "Placing order…" : "Place order"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Order summary sidebar */}
        <div className="h-fit rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-bold text-gray-900">Order summary</h2>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>{cart.itemCount} item{cart.itemCount !== 1 ? "s" : ""}</span>
              <span>{formatPaise(cart.subtotalInPaise)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Shipping</span>
              <span>Calculated later</span>
            </div>
          </div>
          <div className="my-3 border-t border-gray-200" />
          <div className="flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span>{formatPaise(cart.subtotalInPaise)}</span>
          </div>
          <div className="mt-4 space-y-1 text-xs text-gray-400">
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span className="truncate">{item.productName}</span>
                <span className="ml-2 flex-shrink-0">×{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Address Dialog */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add new address</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAddress} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="addr-label">Label</Label>
                <Input
                  id="addr-label"
                  placeholder="Home, Office…"
                  value={addressForm.label}
                  onChange={(e) =>
                    setAddressForm((f) => ({ ...f, label: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="addr-line1">Address line 1</Label>
                <Input
                  id="addr-line1"
                  placeholder="123 Main St"
                  value={addressForm.line1}
                  onChange={(e) =>
                    setAddressForm((f) => ({ ...f, line1: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="addr-line2">Address line 2 (optional)</Label>
                <Input
                  id="addr-line2"
                  placeholder="Apt, Suite…"
                  value={addressForm.line2}
                  onChange={(e) =>
                    setAddressForm((f) => ({ ...f, line2: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="addr-city">City</Label>
                <Input
                  id="addr-city"
                  placeholder="Bhubaneswar"
                  value={addressForm.city}
                  onChange={(e) =>
                    setAddressForm((f) => ({ ...f, city: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="addr-state">State</Label>
                <Input
                  id="addr-state"
                  placeholder="Odisha"
                  value={addressForm.state}
                  onChange={(e) =>
                    setAddressForm((f) => ({ ...f, state: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="addr-postal">Postal code</Label>
                <Input
                  id="addr-postal"
                  placeholder="751001"
                  value={addressForm.postalCode}
                  onChange={(e) =>
                    setAddressForm((f) => ({ ...f, postalCode: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="addr-phone">Phone</Label>
                <Input
                  id="addr-phone"
                  placeholder="+91 99999 99999"
                  value={addressForm.phone}
                  onChange={(e) =>
                    setAddressForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="addr-default"
                checked={addressForm.isDefault}
                onChange={(e) =>
                  setAddressForm((f) => ({ ...f, isDefault: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <Label htmlFor="addr-default" className="cursor-pointer text-sm">
                Set as default address
              </Label>
            </div>
            {addressError && (
              <p className="text-sm text-red-600">{addressError}</p>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddressDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={savingAddress}>
                {savingAddress ? "Saving…" : "Save address"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
