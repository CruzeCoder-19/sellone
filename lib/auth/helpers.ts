import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { hasRole, type Role } from "@/lib/auth/roles";

/**
 * Fetch the full User row for the currently authenticated session.
 * Wrapped in React's `cache()` so multiple Server Components in the same
 * render share a single DB query instead of each making their own.
 * Returns null if unauthenticated or if the user has been soft-deleted.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;

  // findUnique by PK; check soft-delete in application code
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { userRoles: true },
  });

  if (!user || user.deletedAt !== null) return null;
  return user;
});

/**
 * Require an authenticated user. Redirects to /login if unauthenticated.
 * Use in Server Components and Server Actions that need the current user.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Require the current user to hold at least one of the specified roles.
 * Redirects to /unauthorized if the role check fails.
 * Named requireRoles (plural) to avoid collision with requireRole() in lib/auth/roles.ts.
 */
export async function requireRoles(...roles: Role[]) {
  const user = await requireUser();
  if (!hasRole(user.userRoles.map((r) => r.role), ...roles)) {
    redirect("/unauthorized");
  }
  return user;
}
