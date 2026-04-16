"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

const addressSchema = z.object({
  label: z.string().min(1, "Label is required").max(50),
  line1: z.string().min(1, "Address line 1 is required").max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(100),
  postalCode: z.string().min(1, "Postal code is required").max(20),
  country: z.string().max(2).optional(),
  phone: z.string().min(1, "Phone is required").max(20),
  isDefault: z.boolean().optional(),
});

async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function createAddress(
  input: z.infer<typeof addressSchema>,
): Promise<ActionResult<{ id: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { label, line1, line2, city, state, postalCode, country, phone, isDefault } =
    parsed.data;

  const address = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return tx.address.create({
      data: {
        userId,
        label,
        line1,
        line2,
        city,
        state,
        postalCode,
        country: country ?? "IN",
        phone,
        isDefault: isDefault ?? false,
      },
    });
  });

  return { ok: true, data: { id: address.id } };
}

export async function updateAddress(
  input: z.infer<typeof addressSchema> & { id: string },
): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const { id, ...rest } = input;
  const parsed = addressSchema.safeParse(rest);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) return { ok: false, error: "Address not found" };

  const { label, line1, line2, city, state, postalCode, country, phone, isDefault } =
    parsed.data;

  await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    await tx.address.update({
      where: { id },
      data: { label, line1, line2, city, state, postalCode, country, phone, isDefault: isDefault ?? false },
    });
  });

  return { ok: true };
}

export async function deleteAddress({ id }: { id: string }): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) return { ok: false, error: "Address not found" };

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id } });
    if (existing.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      if (next) {
        await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
  });

  return { ok: true };
}
