import { Prisma, type LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SalesStats = {
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  activeLeads: number;
  wonValueInPaise: number;
};

export type AchieverRow = Prisma.AchieverEntryGetPayload<{
  include: { user: { select: { id: true; name: true; email: true } } };
}>;

// ─────────────────────────────────────────────────────────────────────────────
// getSalesProfile
// ─────────────────────────────────────────────────────────────────────────────

export async function getSalesProfile(userId: string) {
  return prisma.salesProfile.findUnique({ where: { userId } });
}

// ─────────────────────────────────────────────────────────────────────────────
// getLeads
// ─────────────────────────────────────────────────────────────────────────────

export async function getLeads(
  salesProfileId: string,
  opts: { page: number; pageSize: number; status?: LeadStatus },
): Promise<{ rows: Prisma.SalesLeadGetPayload<object>[]; total: number }> {
  const { page, pageSize, status } = opts;
  const skip = (page - 1) * pageSize;

  const where: Prisma.SalesLeadWhereInput = {
    salesProfileId,
    ...(status ? { status } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.salesLead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.salesLead.count({ where }),
  ]);

  return { rows, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// getLeadById
// ─────────────────────────────────────────────────────────────────────────────

export async function getLeadById(salesProfileId: string, leadId: string) {
  return prisma.salesLead.findFirst({
    where: { id: leadId, salesProfileId },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// getSalesStats
// ─────────────────────────────────────────────────────────────────────────────

export async function getSalesStats(salesProfileId: string): Promise<SalesStats> {
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const profile = await prisma.salesProfile.findUnique({
    where: { id: salesProfileId },
    select: { userId: true },
  });

  const [totalLeads, wonLeads, lostLeads, activeLeads, wonEntry] = await Promise.all([
    prisma.salesLead.count({ where: { salesProfileId } }),
    prisma.salesLead.count({ where: { salesProfileId, status: "WON" } }),
    prisma.salesLead.count({ where: { salesProfileId, status: "LOST" } }),
    prisma.salesLead.count({
      where: { salesProfileId, status: { in: ["NEW", "CONTACTED", "QUALIFIED"] } },
    }),
    profile
      ? prisma.achieverEntry.findUnique({
          where: { userId_period: { userId: profile.userId, period } },
        })
      : null,
  ]);

  return {
    totalLeads,
    wonLeads,
    lostLeads,
    activeLeads,
    wonValueInPaise: wonEntry?.metricInPaise ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getAchieverBoard
// ─────────────────────────────────────────────────────────────────────────────

export async function getAchieverBoard({
  period,
  limit,
}: {
  period: string;
  limit: number;
}): Promise<AchieverRow[]> {
  return prisma.achieverEntry.findMany({
    where: { period },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ metricInPaise: "desc" }],
    take: limit,
  });
}
