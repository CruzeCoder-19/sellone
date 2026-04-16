"use server";

import { auth } from "@/auth";
import { listAddresses } from "@/server/queries/address.queries";
import type { Address } from "@prisma/client";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function listAddressesAction(): Promise<ActionResult<Address[]>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };
  const data = await listAddresses(session.user.id);
  return { ok: true, data };
}
