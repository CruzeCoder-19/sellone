"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function subscribeNewsletter(input: { email: string }): Promise<ActionResult> {
  try {
    const { email } = z.object({ email: z.string().email("Invalid email address") }).parse(input);

    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });

    if (existing) {
      if (existing.confirmedAt !== null) {
        return { ok: false, error: "Already subscribed." };
      }
      // Re-trigger: update createdAt so they know we received it again
      await prisma.newsletterSubscriber.update({
        where: { email },
        data: { createdAt: new Date(), confirmedAt: new Date() },
      });
      return { ok: true };
    }

    // TODO: implement double opt-in with confirmation email link in production.
    // For now, single opt-in: set confirmedAt immediately.
    await prisma.newsletterSubscriber.create({
      data: { email, confirmedAt: new Date() },
    });

    return { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Invalid email" };
    console.error("[subscribeNewsletter]", err);
    return { ok: false, error: "Subscription failed. Please try again." };
  }
}
