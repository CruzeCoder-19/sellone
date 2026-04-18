"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { RepaymentMethod } from "@prisma/client";

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas
// ─────────────────────────────────────────────────────────────────────────────

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const submitApplicationSchema = z
  .object({
    legalName: z.string().min(1, "Legal name is required"),
    panNumber: z.string().optional(),
    gstin: z.string().optional(),
    businessAddress: z.string().min(1, "Business address is required"),
    monthlyTurnoverInPaise: z.number().int().nonnegative().optional(),
    kycDocAssetIds: z.array(z.string()).max(3),
    draft: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    if (!val.draft) {
      // When submitting for real: panNumber must be present, non-empty, valid format
      if (!val.panNumber || !PAN_RE.test(val.panNumber)) {
        ctx.addIssue({
          code: "custom",
          path: ["panNumber"],
          message: "Valid PAN number is required (format: AAAAA0000A)",
        });
      }
    } else {
      // Draft: if panNumber is provided, it still must be valid format
      if (val.panNumber && !PAN_RE.test(val.panNumber)) {
        ctx.addIssue({
          code: "custom",
          path: ["panNumber"],
          message: "Invalid PAN format (expected: AAAAA0000A)",
        });
      }
    }
    // GSTIN is always optional but must be valid if provided
    if (val.gstin && !GSTIN_RE.test(val.gstin)) {
      ctx.addIssue({
        code: "custom",
        path: ["gstin"],
        message: "Invalid GSTIN format",
      });
    }
  });

const recordRepaymentSchema = z.object({
  amountInPaise: z.number().int().positive("Amount must be positive"),
  method: z.enum(["BANK", "UPI"]),
  utrReference: z.string().min(1, "UTR/Reference number is required"),
});

// ─────────────────────────────────────────────────────────────────────────────
// submitCreditApplication
// ─────────────────────────────────────────────────────────────────────────────

export async function submitCreditApplication(
  input: z.infer<typeof submitApplicationSchema>,
): Promise<ActionResult<{ applicationId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const parsed = submitApplicationSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { ok: false, error: firstError };
  }

  const data = parsed.data;

  // Guard: no pending application already, no approved account
  const [existingPendingApp, existingAccount] = await Promise.all([
    prisma.creditApplication.findFirst({
      where: { userId, status: "PENDING" },
    }),
    prisma.creditAccount.findUnique({
      where: { userId },
    }),
  ]);

  if (existingPendingApp) {
    return { ok: false, error: "Application already under review." };
  }
  if (existingAccount?.status === "APPROVED") {
    return { ok: false, error: "Credit already approved." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the application with KYC asset links
      const application = await tx.creditApplication.create({
        data: {
          userId,
          status: "PENDING",
          submittedAt: new Date(),
          legalName: data.legalName,
          panNumber: data.panNumber ?? "",
          gstin: data.gstin || null,
          businessAddress: data.businessAddress,
          monthlyTurnoverInPaise: data.monthlyTurnoverInPaise ?? null,
          kycAssets: {
            create: data.kycDocAssetIds.map((assetId) => ({ assetId })),
          },
        },
      });

      // 2. Upsert the CreditAccount to PENDING
      if (existingAccount) {
        // Only transition from NONE to PENDING; leave other statuses as-is
        if (existingAccount.status === "NONE") {
          await tx.creditAccount.update({
            where: { userId },
            data: { status: "PENDING" },
          });
        }
      } else {
        await tx.creditAccount.create({
          data: {
            userId,
            status: "PENDING",
            limitInPaise: 0,
            outstandingInPaise: 0,
          },
        });
      }

      return application;
    });

    return { ok: true, data: { applicationId: result.id } };
  } catch (err) {
    console.error("[submitCreditApplication]", err);
    return { ok: false, error: "Failed to submit application. Please try again." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// recordRepayment
// ─────────────────────────────────────────────────────────────────────────────

export async function recordRepayment(
  input: z.infer<typeof recordRepaymentSchema>,
): Promise<ActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const parsed = recordRepaymentSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { ok: false, error: firstError };
  }

  const { amountInPaise, method, utrReference } = parsed.data;

  const account = await prisma.creditAccount.findUnique({
    where: { userId },
  });

  if (!account || account.status !== "APPROVED") {
    return { ok: false, error: "No approved credit account found." };
  }

  if (amountInPaise > account.outstandingInPaise) {
    return {
      ok: false,
      error: `Amount exceeds outstanding balance of ₹${(account.outstandingInPaise / 100).toFixed(2)}.`,
    };
  }

  try {
    await prisma.creditTransaction.create({
      data: {
        creditAccountId: account.id,
        type: "REPAYMENT",
        status: "PENDING_VERIFICATION",
        amountInPaise,
        method: method as RepaymentMethod,
        utrReference,
      },
    });

    return { ok: true };
  } catch (err) {
    console.error("[recordRepayment]", err);
    return { ok: false, error: "Failed to record repayment. Please try again." };
  }
}
