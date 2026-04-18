import { prisma } from "@/lib/db/prisma";
import type { CreditAccount, CreditApplication, CreditTransaction } from "@prisma/client";

export type CreditAccountView = CreditAccount & {
  availableInPaise: number;
};

export type CreditTransactionRow = CreditTransaction & {
  relatedOrder: { orderNumber: string } | null;
};

export async function getCreditAccountForUser(
  userId: string,
): Promise<CreditAccountView | null> {
  const account = await prisma.creditAccount.findUnique({
    where: { userId },
  });
  if (!account) return null;
  return {
    ...account,
    availableInPaise: account.limitInPaise - account.outstandingInPaise,
  };
}

export async function getCreditApplicationForUser(
  userId: string,
): Promise<CreditApplication | null> {
  return prisma.creditApplication.findFirst({
    where: { userId },
    orderBy: { submittedAt: "desc" },
  });
}

export async function getCreditTransactionsForUser(
  userId: string,
  opts: { page: number; pageSize: number },
): Promise<{ rows: CreditTransactionRow[]; total: number }> {
  const account = await prisma.creditAccount.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!account) return { rows: [], total: 0 };

  const { page, pageSize } = opts;
  const skip = (page - 1) * pageSize;

  const [rows, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where: { creditAccountId: account.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        relatedOrder: { select: { orderNumber: true } },
      },
    }),
    prisma.creditTransaction.count({
      where: { creditAccountId: account.id },
    }),
  ]);

  return { rows, total };
}
