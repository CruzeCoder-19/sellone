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

        return { id: user.id, phone: user.phone ?? undefined, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        // user.id is string in practice; cast guards against v5-beta union variance
        token.id = user.id as unknown as string;
      }

      // Explicitly cast to override the Record<string,unknown> index — if we just
      // read token.id directly, TypeScript resolves it as unknown and narrows to
      // {} (NonNullable<unknown>) after the falsy guard, breaking Prisma where clauses.
      const tokenId = token.id as string | undefined;
      if (!tokenId) return token;

      // Check if the roles in the token are stale
      const dbUser = await prisma.user.findUnique({
        where: { id: tokenId },
        select: { rolesUpdatedAt: true },
      });

      const dbTs = dbUser?.rolesUpdatedAt?.getTime() ?? 0;
      // Cast needed: Record<string,unknown> index type bleeds through ?? operator
      const tokenTs = (token.rolesUpdatedAt as number | undefined) ?? 0;

      if (!token.roles || dbTs > tokenTs) {
        const userRoles = await prisma.userRole.findMany({
          where: { userId: tokenId },
        });
        token.roles = userRoles.map((r) => r.role);
        token.rolesUpdatedAt = dbTs;
      }

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
