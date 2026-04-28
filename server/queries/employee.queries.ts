import { prisma } from "@/lib/db/prisma";
import type { EmployeeProfile, EmployeeCheckIn } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// getEmployeeProfile
// ─────────────────────────────────────────────────────────────────────────────

export async function getEmployeeProfile(userId: string): Promise<EmployeeProfile | null> {
  return prisma.employeeProfile.findUnique({ where: { userId } });
}

// ─────────────────────────────────────────────────────────────────────────────
// getTodayCheckIn
// ─────────────────────────────────────────────────────────────────────────────

export async function getTodayCheckIn(
  employeeProfileId: string,
): Promise<EmployeeCheckIn | null> {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  return prisma.employeeCheckIn.findFirst({
    where: {
      employeeProfileId,
      checkInAt: { gte: startOfToday },
    },
    orderBy: { checkInAt: "desc" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// getCheckIns
// ─────────────────────────────────────────────────────────────────────────────

export async function getCheckIns(
  employeeProfileId: string,
  opts: { page: number; pageSize: number },
): Promise<{ rows: EmployeeCheckIn[]; total: number }> {
  const { page, pageSize } = opts;
  const skip = (page - 1) * pageSize;

  const [rows, total] = await Promise.all([
    prisma.employeeCheckIn.findMany({
      where: { employeeProfileId },
      orderBy: { checkInAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.employeeCheckIn.count({ where: { employeeProfileId } }),
  ]);

  return { rows, total };
}
