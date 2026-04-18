"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireRoles } from "@/lib/auth/helpers";

// ─────────────────────────────────────────────────────────────────────────────
// Types and helpers
// ─────────────────────────────────────────────────────────────────────────────

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

class AdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminError";
  }
}

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

const MAX_RETRIES = 3;
const BACKOFF_MS = [50, 200, 800];

// ─────────────────────────────────────────────────────────────────────────────
// reviewCreditApplication
// ─────────────────────────────────────────────────────────────────────────────

const reviewSchema = z
  .object({
    applicationId: z.string().min(1),
    decision: z.enum(["APPROVE", "REJECT"]),
    limitInPaise: z.number().int().positive().optional(),
    rejectionReason: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.decision === "APPROVE") {
      if (!val.limitInPaise || val.limitInPaise <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["limitInPaise"],
          message: "Credit limit is required when approving",
        });
      }
    }
    if (val.decision === "REJECT") {
      if (!val.rejectionReason || val.rejectionReason.trim() === "") {
        ctx.addIssue({
          code: "custom",
          path: ["rejectionReason"],
          message: "Rejection reason is required",
        });
      }
    }
  });

export async function reviewCreditApplication(
  input: z.input<typeof reviewSchema>,
): Promise<ActionResult> {
  const reviewer = await requireRoles("EMPLOYEE", "ADMIN");

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { applicationId, decision, limitInPaise, rejectionReason } = parsed.data;

  const app = await prisma.creditApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, status: true, userId: true },
  });
  if (!app) return { ok: false, error: "Application not found." };
  if (app.status !== "PENDING") return { ok: false, error: "Application is no longer pending." };

  try {
    await prisma.$transaction(async (ctx) => {
      // Update the application — REJECT maps to CLOSED (no REJECTED value in CreditStatus)
      await ctx.creditApplication.update({
        where: { id: applicationId },
        data: {
          status: decision === "APPROVE" ? "APPROVED" : "CLOSED",
          reviewedAt: new Date(),
          reviewedById: reviewer.id,
          rejectionReason: decision === "REJECT" ? rejectionReason : undefined,
        },
      });

      if (decision === "APPROVE") {
        await ctx.creditAccount.update({
          where: { userId: app.userId },
          data: {
            status: "APPROVED",
            limitInPaise: limitInPaise!,
            approvedAt: new Date(),
            approvedById: reviewer.id,
          },
        });
      } else {
        // Reset to NONE so the customer can re-apply
        await ctx.creditAccount.update({
          where: { userId: app.userId },
          data: { status: "NONE" },
        });
      }
    });

    return { ok: true };
  } catch (err) {
    console.error("[reviewCreditApplication] error:", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// verifyRepayment
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyRepayment(input: {
  transactionId: string;
  decision: "CONFIRM" | "REJECT";
}): Promise<ActionResult> {
  const verifier = await requireRoles("EMPLOYEE", "ADMIN");

  if (!input.transactionId) return { ok: false, error: "Transaction ID is required." };
  if (input.decision !== "CONFIRM" && input.decision !== "REJECT") {
    return { ok: false, error: "Invalid decision." };
  }

  // Pre-fetch outside the transaction for fast validation
  const repaymentTx = await prisma.creditTransaction.findUnique({
    where: { id: input.transactionId },
    select: { id: true, type: true, status: true, creditAccountId: true, amountInPaise: true },
  });
  if (!repaymentTx) return { ok: false, error: "Transaction not found." };
  if (repaymentTx.type !== "REPAYMENT") {
    return { ok: false, error: "Only repayment transactions can be verified." };
  }
  if (repaymentTx.status !== "PENDING_VERIFICATION") {
    return { ok: false, error: "Transaction is not pending verification." };
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await prisma.$transaction(
        async (ctx) => {
          await ctx.creditTransaction.update({
            where: { id: input.transactionId },
            data: {
              status: input.decision === "CONFIRM" ? "CONFIRMED" : "REJECTED",
              verifiedById: verifier.id,
              verifiedAt: new Date(),
            },
          });

          if (input.decision === "CONFIRM") {
            const account = await ctx.creditAccount.findUnique({
              where: { id: repaymentTx.creditAccountId },
              select: { outstandingInPaise: true },
            });
            if (!account) throw new AdminError("Credit account not found.");
            if (account.outstandingInPaise - repaymentTx.amountInPaise < 0) {
              throw new AdminError("Outstanding balance mismatch — contact admin.");
            }
            await ctx.creditAccount.update({
              where: { id: repaymentTx.creditAccountId },
              data: { outstandingInPaise: { decrement: repaymentTx.amountInPaise } },
            });
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return { ok: true };
    } catch (err) {
      if (err instanceof AdminError) return { ok: false, error: err.message };
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2034"
      ) {
        if (attempt < MAX_RETRIES - 1) {
          await sleep(BACKOFF_MS[attempt] ?? 800);
          continue;
        }
        return { ok: false, error: "Please try again — the system is busy." };
      }
      console.error("[verifyRepayment] error:", err);
      return { ok: false, error: "Something went wrong. Please try again." };
    }
  }
  return { ok: false, error: "Please try again — the system is busy." };
}

// ─────────────────────────────────────────────────────────────────────────────
// adjustCredit
// ─────────────────────────────────────────────────────────────────────────────

export async function adjustCredit(input: {
  userId: string;
  amountInPaise: number;
  type: "INCREASE_OUTSTANDING" | "DECREASE_OUTSTANDING";
  reason: string;
}): Promise<ActionResult> {
  const actor = await requireRoles("EMPLOYEE", "ADMIN");

  if (!input.userId) return { ok: false, error: "User ID is required." };
  if (!input.amountInPaise || input.amountInPaise <= 0) {
    return { ok: false, error: "Amount must be positive." };
  }
  if (!input.reason?.trim()) return { ok: false, error: "Reason is required." };
  if (
    input.type !== "INCREASE_OUTSTANDING" &&
    input.type !== "DECREASE_OUTSTANDING"
  ) {
    return { ok: false, error: "Invalid adjustment type." };
  }

  const account = await prisma.creditAccount.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  });
  if (!account) return { ok: false, error: "Credit account not found." };

  const isIncrease = input.type === "INCREASE_OUTSTANDING";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await prisma.$transaction(
        async (ctx) => {
          const current = await ctx.creditAccount.findUnique({
            where: { id: account.id },
            select: { outstandingInPaise: true },
          });
          if (!current) throw new AdminError("Credit account not found.");

          if (!isIncrease && current.outstandingInPaise - input.amountInPaise < 0) {
            throw new AdminError("Cannot decrease outstanding balance below zero.");
          }

          await ctx.creditAccount.update({
            where: { id: account.id },
            data: isIncrease
              ? { outstandingInPaise: { increment: input.amountInPaise } }
              : { outstandingInPaise: { decrement: input.amountInPaise } },
          });

          // Store negative amountInPaise for DECREASE so it reads as a credit
          await ctx.creditTransaction.create({
            data: {
              creditAccountId: account.id,
              type: "ADJUSTMENT",
              status: "CONFIRMED",
              amountInPaise: isIncrease ? input.amountInPaise : -input.amountInPaise,
            },
          });

          await ctx.auditLog.create({
            data: {
              actorId: actor.id,
              action: "CREDIT_ADJUSTMENT",
              entity: "CreditAccount",
              entityId: account.id,
              metadata: {
                amountInPaise: input.amountInPaise,
                type: input.type,
                reason: input.reason,
              },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return { ok: true };
    } catch (err) {
      if (err instanceof AdminError) return { ok: false, error: err.message };
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2034"
      ) {
        if (attempt < MAX_RETRIES - 1) {
          await sleep(BACKOFF_MS[attempt] ?? 800);
          continue;
        }
        return { ok: false, error: "Please try again — the system is busy." };
      }
      console.error("[adjustCredit] error:", err);
      return { ok: false, error: "Something went wrong. Please try again." };
    }
  }
  return { ok: false, error: "Please try again — the system is busy." };
}

// ─────────────────────────────────────────────────────────────────────────────
// suspendCreditAccount
// ─────────────────────────────────────────────────────────────────────────────

export async function suspendCreditAccount(input: {
  userId: string;
  reason: string;
}): Promise<ActionResult> {
  const actor = await requireRoles("EMPLOYEE", "ADMIN");

  if (!input.reason?.trim()) return { ok: false, error: "Reason is required." };

  const account = await prisma.creditAccount.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  });
  if (!account) return { ok: false, error: "Credit account not found." };

  try {
    await prisma.$transaction(async (ctx) => {
      await ctx.creditAccount.update({
        where: { id: account.id },
        data: { status: "SUSPENDED" },
      });
      await ctx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "CREDIT_SUSPEND",
          entity: "CreditAccount",
          entityId: account.id,
          metadata: { reason: input.reason },
        },
      });
    });
    return { ok: true };
  } catch (err) {
    console.error("[suspendCreditAccount] error:", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// reinstateCreditAccount
// ─────────────────────────────────────────────────────────────────────────────

export async function reinstateCreditAccount(input: {
  userId: string;
}): Promise<ActionResult> {
  const actor = await requireRoles("EMPLOYEE", "ADMIN");

  const account = await prisma.creditAccount.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  });
  if (!account) return { ok: false, error: "Credit account not found." };

  try {
    await prisma.$transaction(async (ctx) => {
      await ctx.creditAccount.update({
        where: { id: account.id },
        data: { status: "APPROVED" },
      });
      await ctx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "CREDIT_REINSTATE",
          entity: "CreditAccount",
          entityId: account.id,
          metadata: {},
        },
      });
    });
    return { ok: true };
  } catch (err) {
    console.error("[reinstateCreditAccount] error:", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
