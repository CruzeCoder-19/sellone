// EDGE-SAFE — do not import Prisma, bcryptjs, or @netlify/blobs.
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    // Shape only — no authorize() here (would pull in Prisma/bcrypt)
    Credentials({ id: "credentials", credentials: { email: {}, password: {} } }),
    Credentials({ id: "phone-otp", credentials: { phone: {}, otp: {} } }),
  ],
  callbacks: {
    // Edge-safe: reads JWT, no DB
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
