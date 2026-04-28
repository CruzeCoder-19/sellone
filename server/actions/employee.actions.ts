"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireRoles } from "@/lib/auth/helpers";
import { getEmployeeProfile, getTodayCheckIn } from "@/server/queries/employee.queries";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ActionResult = { ok: true } | { ok: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// createEmployeeProfile
// ─────────────────────────────────────────────────────────────────────────────

export async function createEmployeeProfile(input: {
  employeeCode: string;
  department?: string;
}): Promise<ActionResult> {
  try {
    const user = await requireRoles("EMPLOYEE", "ADMIN");

    const existing = await getEmployeeProfile(user.id);
    if (existing) return { ok: false, error: "Employee profile already exists." };

    await prisma.employeeProfile.create({
      data: {
        userId: user.id,
        employeeCode: input.employeeCode.trim().toUpperCase(),
        department: input.department?.trim() || null,
        joinedAt: new Date(),
      },
    });

    return { ok: true };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: false, error: "Employee code already taken." };
    }
    console.error("[createEmployeeProfile]", err);
    return { ok: false, error: "Failed to create profile." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// checkIn
// ─────────────────────────────────────────────────────────────────────────────

export async function checkIn(): Promise<ActionResult> {
  try {
    const user = await requireRoles("EMPLOYEE", "ADMIN");

    const profile = await getEmployeeProfile(user.id);
    if (!profile) return { ok: false, error: "Set up your employee profile first." };

    const todayRecord = await getTodayCheckIn(profile.id);
    if (todayRecord) {
      if (todayRecord.checkOutAt === null) {
        return { ok: false, error: "Already checked in." };
      }
      return { ok: false, error: "Already checked in and out today." };
    }

    await prisma.employeeCheckIn.create({
      data: {
        employeeProfileId: profile.id,
        checkInAt: new Date(),
      },
    });

    return { ok: true };
  } catch (err) {
    console.error("[checkIn]", err);
    return { ok: false, error: "Check-in failed." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// checkOut
// ─────────────────────────────────────────────────────────────────────────────

export async function checkOut(): Promise<ActionResult> {
  try {
    const user = await requireRoles("EMPLOYEE", "ADMIN");

    const profile = await getEmployeeProfile(user.id);
    if (!profile) return { ok: false, error: "Set up your employee profile first." };

    const todayRecord = await getTodayCheckIn(profile.id);
    if (!todayRecord) return { ok: false, error: "No check-in found for today." };
    if (todayRecord.checkOutAt !== null) {
      return { ok: false, error: "Already checked out today." };
    }

    await prisma.employeeCheckIn.update({
      where: { id: todayRecord.id },
      data: { checkOutAt: new Date() },
    });

    return { ok: true };
  } catch (err) {
    console.error("[checkOut]", err);
    return { ok: false, error: "Check-out failed." };
  }
}
