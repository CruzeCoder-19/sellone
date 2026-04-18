import { prisma } from "@/lib/db/prisma";
import type {
  CreditAccount,
  CreditApplication,
  CreditTransaction,
  CreditStatus,
} from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PendingApplicationRow = CreditApplication & {
  user: { name: string | null; email: string | null; phone: string | null };
};

export type PendingRepaymentRow = CreditTransaction & {
  creditAccount: {
    user: { name: string | null; email: string | null };
  };
};

export type CreditAccountAdminRow = CreditAccount & {
  user: { name: string | null; email: string | null };
  availableInPaise: number;
};

export type AdminTransactionRow = CreditTransaction & {
  relatedOrder: { orderNumber: string } | null;
  verifiedBy: { name: string | null } | null;
};

type ApplicationWithKyc = CreditApplication & {
  kycAssets: {
    asset: { id: string; key: string; store: string; contentType: string };
  }[];
};

export type ReviewApplicationDetail = CreditApplication & {
  user: { id: string; name: string | null; email: string | null; phone: string | null };
  kycAssets: {
    asset: { id: string; key: string; store: string; contentType: string };
  }[];
  pastApplications: Pick<
    CreditApplication,
    "id" | "status" | "submittedAt" | "rejectionReason"
  >[];
};

export type CreditAccountDetail = CreditAccount & {
  user: { id: string; name: string | null; email: string | null; phone: string | null };
  applications: ApplicationWithKyc[];
  availableInPaise: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// getPendingCounts
// ─────────────────────────────────────────────────────────────────────────────

export async function getPendingCounts(): Promise<{
  applications: number;
  repayments: number;
}> {
  const [applications, repayments] = await Promise.all([
    prisma.creditApplication.count({ where: { status: "PENDING" } }),
    prisma.creditTransaction.count({
      where: { type: "REPAYMENT", status: "PENDING_VERIFICATION" },
    }),
  ]);
  return { applications, repayments };
}

// ─────────────────────────────────────────────────────────────────────────────
// getPendingApplications
// ─────────────────────────────────────────────────────────────────────────────

export async function getPendingApplications({
  page,
  pageSize,
}: {
  page: number;
  pageSize: number;
}): Promise<{ rows: PendingApplicationRow[]; total: number }> {
  const skip = (page - 1) * pageSize;
  const [rows, total] = await Promise.all([
    prisma.creditApplication.findMany({
      where: { status: "PENDING" },
      orderBy: { submittedAt: "asc" },
      skip,
      take: pageSize,
      include: { user: { select: { name: true, email: true, phone: true } } },
    }),
    prisma.creditApplication.count({ where: { status: "PENDING" } }),
  ]);
  return { rows, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// getPendingRepayments
// ─────────────────────────────────────────────────────────────────────────────

export async function getPendingRepayments({
  page,
  pageSize,
}: {
  page: number;
  pageSize: number;
}): Promise<{ rows: PendingRepaymentRow[]; total: number }> {
  const skip = (page - 1) * pageSize;
  const [rows, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where: { type: "REPAYMENT", status: "PENDING_VERIFICATION" },
      orderBy: { createdAt: "asc" },
      skip,
      take: pageSize,
      include: {
        creditAccount: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
    }),
    prisma.creditTransaction.count({
      where: { type: "REPAYMENT", status: "PENDING_VERIFICATION" },
    }),
  ]);
  return { rows, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// getAllCreditAccounts
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllCreditAccounts({
  page,
  pageSize,
  statusFilter,
}: {
  page: number;
  pageSize: number;
  statusFilter?: string;
}): Promise<{ rows: CreditAccountAdminRow[]; total: number }> {
  const where = statusFilter ? { status: statusFilter as CreditStatus } : {};
  const skip = (page - 1) * pageSize;
  const [rows, total] = await Promise.all([
    prisma.creditAccount.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.creditAccount.count({ where }),
  ]);
  return {
    rows: rows.map((r) => ({
      ...r,
      availableInPaise: r.limitInPaise - r.outstandingInPaise,
    })),
    total,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getApplicationForReview
// ─────────────────────────────────────────────────────────────────────────────

export async function getApplicationForReview(
  applicationId: string,
): Promise<ReviewApplicationDetail | null> {
  const app = await prisma.creditApplication.findUnique({
    where: { id: applicationId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      kycAssets: {
        include: {
          asset: { select: { id: true, key: true, store: true, contentType: true } },
        },
      },
    },
  });
  if (!app) return null;

  const pastApplications = await prisma.creditApplication.findMany({
    where: { userId: app.userId, id: { not: applicationId } },
    orderBy: { submittedAt: "desc" },
    select: { id: true, status: true, submittedAt: true, rejectionReason: true },
  });

  return { ...app, pastApplications };
}

// ─────────────────────────────────────────────────────────────────────────────
// getCreditAccountDetails
// ─────────────────────────────────────────────────────────────────────────────

export async function getCreditAccountDetails(
  userId: string,
): Promise<CreditAccountDetail | null> {
  const [account, applications] = await Promise.all([
    prisma.creditAccount.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    }),
    prisma.creditApplication.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" },
      include: {
        kycAssets: {
          include: {
            asset: { select: { id: true, key: true, store: true, contentType: true } },
          },
        },
      },
    }),
  ]);
  if (!account) return null;
  return {
    ...account,
    applications,
    availableInPaise: account.limitInPaise - account.outstandingInPaise,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getTransactionsForAccount
// ─────────────────────────────────────────────────────────────────────────────

export async function getTransactionsForAccount(
  creditAccountId: string,
  { page, pageSize }: { page: number; pageSize: number },
): Promise<{ rows: AdminTransactionRow[]; total: number }> {
  const skip = (page - 1) * pageSize;
  const [rows, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where: { creditAccountId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        relatedOrder: { select: { orderNumber: true } },
        verifiedBy: { select: { name: true } },
      },
    }),
    prisma.creditTransaction.count({ where: { creditAccountId } }),
  ]);
  return { rows, total };
}
