"use server";

import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getSmsProvider } from "@/lib/sms";

type ActionResult = { ok: true } | { ok: false; error: string };

const phoneSchema = z.object({
  phone: z.string().min(1, "Phone number is required"),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

export async function sendOtp(input: { phone: string }): Promise<ActionResult> {
  const parsed = phoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { phone } = parsed.data;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Postgres-based rate limit. Acceptable for current traffic. If OTP send becomes a hot path, revisit with Upstash Redis sliding window.
  const recentCount = await prisma.otpToken.count({
    where: { identifier: phone, createdAt: { gte: oneHourAgo } },
  });
  if (recentCount >= 3) {
    return { ok: false, error: "Too many OTP requests. Please try again in an hour." };
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = createHash("sha256")
    .update(code + process.env.OTP_PEPPER!)
    .digest("hex");

  await prisma.otpToken.create({
    data: {
      identifier: phone,
      codeHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  try {
    await getSmsProvider().send(
      phone,
      `Your Wolsell OTP is ${code}. Valid for 5 minutes.`,
    );
  } catch (err) {
    console.error("[sendOtp] SMS send failed:", err);
    return { ok: false, error: "Failed to send OTP. Please try again." };
  }

  return { ok: true };
}

export async function registerWithEmail(input: {
  email: string;
  password: string;
  name: string;
}): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, password, name } = parsed.data;

  // Check for an existing non-deleted account with this email
  const existing = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name, passwordHash, rolesUpdatedAt: now },
      });

      await tx.cart.create({ data: { userId: user.id } });
      await tx.wishlist.create({ data: { userId: user.id } });
      await tx.compareList.create({ data: { userId: user.id } });
      await tx.userRole.create({ data: { userId: user.id, role: "CUSTOMER" } });
    });

    return { ok: true };
  } catch (err) {
    console.error("[registerWithEmail]", err);
    return { ok: false, error: "Registration failed. Please try again." };
  }
}
