"use server";

import { prisma } from "@/lib/db/prisma";
import { requireRoles } from "@/lib/auth/helpers";
import { getSalesProfile } from "@/server/queries/sales.queries";
import type { LeadStatus } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// createSalesProfile
// ─────────────────────────────────────────────────────────────────────────────

export async function createSalesProfile(input: {
  region?: string;
}): Promise<ActionResult> {
  try {
    const user = await requireRoles("SALES", "ADMIN");

    const existing = await getSalesProfile(user.id);
    if (existing) return { ok: false, error: "Sales profile already exists." };

    await prisma.salesProfile.create({
      data: {
        userId: user.id,
        region: input.region?.trim() || null,
      },
    });

    return { ok: true };
  } catch (err) {
    console.error("[createSalesProfile]", err);
    return { ok: false, error: "Failed to create profile." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// createLead
// ─────────────────────────────────────────────────────────────────────────────

export async function createLead(input: {
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
}): Promise<ActionResult<{ leadId: string }>> {
  try {
    const user = await requireRoles("SALES", "ADMIN");

    const profile = await getSalesProfile(user.id);
    if (!profile) return { ok: false, error: "Sales profile not found. Please set up your profile first." };

    const lead = await prisma.salesLead.create({
      data: {
        salesProfileId: profile.id,
        contactName: input.contactName.trim(),
        contactPhone: input.contactPhone?.trim() || null,
        contactEmail: input.contactEmail?.trim() || null,
        notes: input.notes?.trim() || null,
        status: "NEW",
      },
      select: { id: true },
    });

    return { ok: true, data: { leadId: lead.id } };
  } catch (err) {
    console.error("[createLead]", err);
    return { ok: false, error: "Failed to create lead." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateLead
// ─────────────────────────────────────────────────────────────────────────────

export async function updateLead(input: {
  leadId: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  status?: LeadStatus;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const user = await requireRoles("SALES", "ADMIN");

    const profile = await getSalesProfile(user.id);
    if (!profile) return { ok: false, error: "Sales profile not found." };

    // Ownership check
    const lead = await prisma.salesLead.findFirst({
      where: { id: input.leadId, salesProfileId: profile.id },
      select: { id: true },
    });
    if (!lead) return { ok: false, error: "Lead not found or access denied." };

    await prisma.salesLead.update({
      where: { id: input.leadId },
      data: {
        contactName: input.contactName?.trim(),
        contactPhone: input.contactPhone?.trim() || null,
        contactEmail: input.contactEmail?.trim() || null,
        status: input.status,
        notes: input.notes?.trim() || null,
      },
    });

    return { ok: true };
  } catch (err) {
    console.error("[updateLead]", err);
    return { ok: false, error: "Failed to update lead." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteLead
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteLead(leadId: string): Promise<ActionResult> {
  try {
    const user = await requireRoles("SALES", "ADMIN");

    const profile = await getSalesProfile(user.id);
    if (!profile) return { ok: false, error: "Sales profile not found." };

    const lead = await prisma.salesLead.findFirst({
      where: { id: leadId, salesProfileId: profile.id },
      select: { id: true },
    });
    if (!lead) return { ok: false, error: "Lead not found or access denied." };

    await prisma.salesLead.delete({ where: { id: leadId } });
    return { ok: true };
  } catch (err) {
    console.error("[deleteLead]", err);
    return { ok: false, error: "Failed to delete lead." };
  }
}
