import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; roles: string[] } & DefaultSession["user"];
  }
}

// next-auth/jwt re-exports from @auth/core/jwt. Augmenting the source module
// is required for the jwt callback's token parameter to pick up custom fields.
declare module "@auth/core/jwt" {
  interface JWT {
    /** Populated on first sign-in. Carries the user's DB id. */
    id?: string;
    /** Role array mirrored from UserRole join table. */
    roles?: string[];
    /** getTime() of User.rolesUpdatedAt at last JWT refresh. Used for stale-role detection. */
    rolesUpdatedAt?: number;
    /** Epoch ms of the last time roles were re-checked against the DB. Used to bound re-check frequency to once per 60 s. */
    lastRoleCheckAt?: number;
  }
}
