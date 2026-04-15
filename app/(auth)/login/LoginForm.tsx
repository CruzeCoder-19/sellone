"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendOtp } from "@/server/actions/auth.actions";
import { mergeGuestCart, mergeGuestWishlist, mergeGuestCompare } from "@/server/actions/cart.actions";
import {
  readGuestCart,
  readGuestWishlist,
  readGuestCompare,
  clearGuestCart,
  clearGuestWishlist,
  clearGuestCompare,
} from "@/lib/guest-storage";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const phoneSchema = z.object({
  phone: z.string().min(10, "Enter a valid phone number"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d+$/, "OTP must be numeric"),
});

type EmailForm = z.infer<typeof emailSchema>;
type PhoneForm = z.infer<typeof phoneSchema>;
type OtpForm = z.infer<typeof otpSchema>;

// ─── Guest merge helper ───────────────────────────────────────────────────────

async function mergeGuestDataAndRedirect(
  router: ReturnType<typeof useRouter>,
  callbackUrl: string,
) {
  const guestCart = readGuestCart();
  const guestWishlist = readGuestWishlist();
  const guestCompare = readGuestCompare();

  const mergePromises = [];
  if (guestCart.length > 0) mergePromises.push(mergeGuestCart({ items: guestCart }));
  if (guestWishlist.length > 0) mergePromises.push(mergeGuestWishlist({ items: guestWishlist }));
  if (guestCompare.length > 0) mergePromises.push(mergeGuestCompare({ items: guestCompare }));

  if (mergePromises.length > 0) {
    const results = await Promise.all(mergePromises);
    // Clear guest storage now that data has been merged
    clearGuestCart();
    clearGuestWishlist();
    clearGuestCompare();

    // Build a summary toast
    let cartMerged = 0;
    let wishlistMerged = 0;
    let idx = 0;
    if (guestCart.length > 0) {
      const r = results[idx++];
      if (r && "data" in r && r.data) cartMerged = (r.data as { merged: number }).merged;
    }
    if (guestWishlist.length > 0) {
      const r = results[idx++];
      if (r && "data" in r && r.data) wishlistMerged = (r.data as { merged: number }).merged;
    }

    const parts: string[] = [];
    if (cartMerged > 0) parts.push(`${cartMerged} cart item${cartMerged !== 1 ? "s" : ""}`);
    if (wishlistMerged > 0) parts.push(`${wishlistMerged} wishlist item${wishlistMerged !== 1 ? "s" : ""}`);
    if (parts.length > 0) {
      toast.success(`Merged ${parts.join(", ")}`);
    }
  }

  router.push(callbackUrl);
}

// ─── Component ───────────────────────────────────────────────────────────────

interface LoginFormProps {
  /** Where to send the user on successful sign-in. Defaults to /customer. */
  callbackUrl: string;
}

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const phoneForm = useForm<PhoneForm>({ resolver: zodResolver(phoneSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  // ── Email + password ──────────────────────────────────────────────────────

  async function handleEmailLogin(data: EmailForm) {
    setError(null);
    setPending(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password.");
      } else {
        await mergeGuestDataAndRedirect(router, callbackUrl);
      }
    } finally {
      setPending(false);
    }
  }

  // ── Phone OTP — step 1: send ───────────────────────────────────────────────

  async function handleSendOtp(data: PhoneForm) {
    setError(null);
    setPending(true);
    try {
      const result = await sendOtp({ phone: data.phone });
      if (!result.ok) {
        setError(result.error);
      } else {
        setPhone(data.phone);
        setOtpSent(true);
      }
    } finally {
      setPending(false);
    }
  }

  // ── Phone OTP — step 2: verify ────────────────────────────────────────────

  async function handleOtpLogin(data: OtpForm) {
    setError(null);
    setPending(true);
    try {
      const result = await signIn("phone-otp", {
        phone,
        otp: data.otp,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid or expired OTP.");
      } else {
        await mergeGuestDataAndRedirect(router, callbackUrl);
      }
    } finally {
      setPending(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Tabs defaultValue="email" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="email">Email</TabsTrigger>
        <TabsTrigger value="phone">Phone</TabsTrigger>
      </TabsList>

      {/* ── Email tab ─────────────────────────────────────────────────────── */}
      <TabsContent value="email" className="mt-4 space-y-4">
        <form onSubmit={emailForm.handleSubmit(handleEmailLogin)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              {...emailForm.register("email")}
            />
            {emailForm.formState.errors.email && (
              <p className="text-sm text-destructive">
                {emailForm.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...emailForm.register("password")}
            />
            {emailForm.formState.errors.password && (
              <p className="text-sm text-destructive">
                {emailForm.formState.errors.password.message}
              </p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-primary hover:underline">
            Register
          </a>
        </p>
      </TabsContent>

      {/* ── Phone tab ─────────────────────────────────────────────────────── */}
      <TabsContent value="phone" className="mt-4 space-y-4">
        {!otpSent ? (
          <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                autoComplete="tel"
                {...phoneForm.register("phone")}
              />
              {phoneForm.formState.errors.phone && (
                <p className="text-sm text-destructive">
                  {phoneForm.formState.errors.phone.message}
                </p>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Sending…" : "Send OTP"}
            </Button>
          </form>
        ) : (
          <form onSubmit={otpForm.handleSubmit(handleOtpLogin)} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit OTP sent to <strong>{phone}</strong>.
            </p>
            <div className="space-y-1">
              <Label htmlFor="otp">OTP</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                autoComplete="one-time-code"
                {...otpForm.register("otp")}
              />
              {otpForm.formState.errors.otp && (
                <p className="text-sm text-destructive">
                  {otpForm.formState.errors.otp.message}
                </p>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Verifying…" : "Verify OTP"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setOtpSent(false);
                setError(null);
                otpForm.reset();
              }}
            >
              Use a different number
            </Button>
          </form>
        )}
      </TabsContent>
    </Tabs>
  );
}
