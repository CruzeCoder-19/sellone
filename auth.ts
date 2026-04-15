import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { authConfig } from "./auth.config";

const emailSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const phoneOtpSchema = z.object({
  phone: z.string().min(1),
  otp: z.string().length(6).regex(/^\d+$/),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      id: "credentials",
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = emailSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Fetch by unique email; check soft-delete in application code
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || user.deletedAt !== null) return null;
        // Phone-OTP-only users have no password
        if (!user.passwordHash) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email ?? undefined, name: user.name ?? undefined };
      },
    }),
    Credentials({
      id: "phone-otp",
      credentials: { phone: {}, otp: {} },
      async authorize(credentials) {
        const parsed = phoneOtpSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { phone, otp } = parsed.data;

        // Find the latest unconsumed, unexpired token for this phone
        const token = await prisma.otpToken.findFirst({
          where: {
            identifier: phone,
            consumedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        });

        if (!token) return null;
        // Hard lockout after 5 failed attempts
        if (token.attempts >= 5) return null;

        const hash = createHash("sha256")
          .update(otp + process.env.OTP_PEPPER!)
          .digest("hex");

        if (hash !== token.codeHash) {
          await prisma.otpToken.update({
            where: { id: token.id },
            data: { attempts: { increment: 1 } },
          });
          return null;
        }

        // Correct OTP — upsert the user and initialise their profile atomically
        const user = await prisma.$transaction(async (tx) => {
          await tx.otpToken.update({
            where: { id: token.id },
            data: { consumedAt: new Date() },
          });

          const u = await tx.user.upsert({
            where: { phone },
            create: { phone, phoneVerified: new Date(), rolesUpdatedAt: new Date() },
            update: {},
          });

          // createMany + skipDuplicates is atomic and idempotent
          await tx.cart.createMany({ data: [{ userId: u.id }], skipDuplicates: true });
          await tx.wishlist.createMany({ data: [{ userId: u.id }], skipDuplicates: true });
          await tx.compareList.createMany({ data: [{ userId: u.id }], skipDuplicates: true });

          await tx.userRole.upsert({
            where: { userId_role: { userId: u.id, role: "CUSTOMER" } },
            create: { userId: u.id, role: "CUSTOMER" },
            update: {},
          });

          // Bump rolesUpdatedAt in the same transaction
          await tx.user.update({
            where: { id: u.id },
            data: { rolesUpdatedAt: new Date() },
          });

          return u;
        });

        return { id: user.id, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    /*
     * Roles are re-checked at most once per 60 s. Worst-case staleness for role
     * grants is 60 s. Without a dedicated cache (Redis), this is the simplest way
     * to bound DB load on the hottest auth path.
     */
    async jwt({ token, user }) {
      // ── First sign-in: token.roles is absent ────────────────────────────────
      if (!token.roles) {
        // user is populated only on first sign-in; on subsequent calls it is
        // undefined and token.id is already set from this branch.
        if (user) {
          token.id = user.id as unknown as string;
        }
        const tokenId = token.id as string | undefined;
        if (!tokenId) return token;

        // Fetch rolesUpdatedAt and roles in parallel — avoids two sequential round-trips.
        const [dbUser, userRoles] = await Promise.all([
          prisma.user.findUnique({ where: { id: tokenId }, select: { rolesUpdatedAt: true } }),
          prisma.userRole.findMany({ where: { userId: tokenId } }),
        ]);

        token.roles = userRoles.map((r) => r.role);
        token.rolesUpdatedAt = dbUser?.rolesUpdatedAt?.getTime() ?? 0;
        token.lastRoleCheckAt = Date.now();
        return token;
      }

      // ── Within the 60 s window: skip DB entirely ────────────────────────────
      const lastCheck = (token.lastRoleCheckAt as number | undefined) ?? 0;
      if (Date.now() - lastCheck < 60_000) return token;

      // ── 60 s elapsed: check for stale roles ─────────────────────────────────
      const tokenId = token.id as string | undefined;
      if (!tokenId) return token;

      const dbUser = await prisma.user.findUnique({
        where: { id: tokenId },
        select: { rolesUpdatedAt: true },
      });

      const dbTs = dbUser?.rolesUpdatedAt?.getTime() ?? 0;
      const tokenTs = (token.rolesUpdatedAt as number | undefined) ?? 0;

      if (dbTs > tokenTs) {
        const userRoles = await prisma.userRole.findMany({ where: { userId: tokenId } });
        token.roles = userRoles.map((r) => r.role);
        token.rolesUpdatedAt = dbTs;
      }

      token.lastRoleCheckAt = Date.now();
      return token;
    },
    async session({ session, token }) {
      // token fields are unknown via Record<string,unknown> index; cast to declared types
      session.user.id = token.id as string;
      session.user.roles = (token.roles as string[] | undefined) ?? [];
      return session;
    },
  },
});
