"use server";

// TODO: Upgrade to PDF in Prompt 8 — currently generates CSV

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { hasRole } from "@/lib/auth/roles";

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// CSV helpers
// ─────────────────────────────────────────────────────────────────────────────

function csvField(value: string | number): string {
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

function csvRow(fields: (string | number)[]): string {
  return fields.map(csvField).join(",");
}

function formatRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// generateCreditStatement
// ─────────────────────────────────────────────────────────────────────────────

export async function generateCreditStatement(input: {
  userId: string;
  fromDate?: string; // ISO date string, e.g. "2025-01-01"
  toDate?: string;   // ISO date string
}): Promise<ActionResult<{ csv: string; filename: string }>> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated." };

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, userRoles: { select: { role: true } } },
  });
  if (!currentUser) return { ok: false, error: "User not found." };

  const roles = currentUser.userRoles.map((r) => r.role);
  const isEmployee = hasRole(roles, "EMPLOYEE", "ADMIN");
  const isCustomer = hasRole(roles, "CUSTOMER");

  if (isEmployee) {
    // EMPLOYEE/ADMIN can download statements for any account — no restriction
  } else if (isCustomer && input.userId === session.user.id) {
    // CUSTOMER can only download their own statement
  } else {
    return { ok: false, error: "Unauthorized." };
  }

  // ── Date range ────────────────────────────────────────────────────────────
  const now = new Date();
  const to = input.toDate ? new Date(input.toDate) : now;
  // End of day for the to date
  to.setHours(23, 59, 59, 999);

  const from = input.fromDate
    ? new Date(input.fromDate)
    : new Date(now.getFullYear(), now.getMonth() - 3, now.getDate(), 0, 0, 0, 0);

  // ── Fetch account ─────────────────────────────────────────────────────────
  const account = await prisma.creditAccount.findUnique({
    where: { userId: input.userId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!account) return { ok: false, error: "Credit account not found." };

  // ── Compute opening balance from all CONFIRMED transactions before `from` ─
  const preTransactions = await prisma.creditTransaction.findMany({
    where: {
      creditAccountId: account.id,
      createdAt: { lt: from },
      status: "CONFIRMED",
    },
    select: { type: true, amountInPaise: true },
  });

  let runningBalance = preTransactions.reduce((acc, tx) => {
    if (tx.type === "CHARGE") return acc + tx.amountInPaise;
    if (tx.type === "REPAYMENT") return acc - tx.amountInPaise; // stored positive, reduces outstanding
    if (tx.type === "ADJUSTMENT") return acc + tx.amountInPaise; // already signed
    return acc;
  }, 0);

  // ── Fetch period transactions ─────────────────────────────────────────────
  const periodTransactions = await prisma.creditTransaction.findMany({
    where: {
      creditAccountId: account.id,
      createdAt: { gte: from, lte: to },
    },
    orderBy: { createdAt: "asc" },
    include: { relatedOrder: { select: { orderNumber: true } } },
  });

  // ── Build CSV ──────────────────────────────────────────────────────────────
  const customerName = account.user.name ?? account.user.email ?? "Unknown";
  const statusLabel: Record<string, string> = {
    NONE: "None",
    PENDING: "Pending Approval",
    APPROVED: "Active",
    SUSPENDED: "Suspended",
    CLOSED: "Closed",
  };

  const lines: string[] = [
    csvRow(["Wolsell Credit Statement"]),
    csvRow(["Customer", customerName]),
    csvRow(["Account Status", statusLabel[account.status] ?? account.status]),
    csvRow(["Credit Limit", `Rs. ${formatRupees(account.limitInPaise)}`]),
    csvRow(["Outstanding Balance", `Rs. ${formatRupees(account.outstandingInPaise)}`]),
    csvRow(["Available Credit", `Rs. ${formatRupees(account.limitInPaise - account.outstandingInPaise)}`]),
    csvRow(["Period", `${formatDate(from)} to ${formatDate(to)}`]),
    csvRow(["Opening Balance", `Rs. ${formatRupees(runningBalance)}`]),
    "",
    csvRow(["Date", "Type", "Description", "Debit (Rs.)", "Credit (Rs.)", "Running Balance (Rs.)"]),
  ];

  for (const tx of periodTransactions) {
    const date = formatDate(new Date(tx.createdAt));

    // Description
    let description = "Transaction";
    if (tx.type === "CHARGE") {
      description = tx.relatedOrder ? `Order ${tx.relatedOrder.orderNumber}` : "Purchase";
    } else if (tx.type === "REPAYMENT") {
      description = tx.utrReference ? `Repayment — UTR ${tx.utrReference}` : "Repayment";
    } else if (tx.type === "ADJUSTMENT") {
      description = "Manual Adjustment";
    }

    let debit = "";
    let credit = "";
    let affectsBalance = false;

    if (tx.type === "CHARGE") {
      debit = formatRupees(tx.amountInPaise);
      affectsBalance = true; // CHARGE status is always CONFIRMED from checkout
    } else if (tx.type === "REPAYMENT") {
      credit = formatRupees(tx.amountInPaise);
      if (tx.status === "CONFIRMED") {
        affectsBalance = true;
      }
    } else if (tx.type === "ADJUSTMENT") {
      if (tx.amountInPaise >= 0) {
        debit = formatRupees(tx.amountInPaise);
      } else {
        credit = formatRupees(Math.abs(tx.amountInPaise));
      }
      affectsBalance = tx.status === "CONFIRMED";
    }

    // Update running balance
    if (affectsBalance) {
      if (tx.type === "CHARGE") {
        runningBalance += tx.amountInPaise;
      } else if (tx.type === "REPAYMENT") {
        runningBalance -= tx.amountInPaise;
      } else if (tx.type === "ADJUSTMENT") {
        runningBalance += tx.amountInPaise;
      }
    }

    const balanceNote = affectsBalance ? "" : " (pending)";

    lines.push(
      csvRow([
        date,
        tx.type,
        description + balanceNote,
        debit,
        credit,
        formatRupees(runningBalance),
      ]),
    );
  }

  lines.push("");
  lines.push(
    csvRow([
      `Generated on ${formatDate(now)}. This is a system-generated statement.`,
    ]),
  );

  const csv = lines.join("\r\n");
  const filename = `credit-statement-${now.toISOString().slice(0, 10)}.csv`;

  return { ok: true, data: { csv, filename } };
}
