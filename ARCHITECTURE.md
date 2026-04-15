# ARCHITECTURE.md

## 1. Folder Structure

```
/
├── app/
│   ├── (auth)/                        # Unauthenticated pages (no layout chrome)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── verify-otp/page.tsx
│   ├── (shop)/                        # Public commerce pages (header + footer, no login required)
│   │   ├── layout.tsx                 # Header, footer, cart icon — no sidebar
│   │   ├── shop/[slug]/page.tsx       # Seller storefront
│   │   ├── product/[slug]/page.tsx    # Product detail
│   │   ├── product-category/
│   │   │   └── [...slug]/page.tsx
│   │   ├── cart/page.tsx              # Cart (merges with account on login)
│   │   ├── checkout/page.tsx          # Checkout (redirects to login if payment needs auth)
│   │   ├── wishlist/page.tsx
│   │   └── track-order/page.tsx
│   ├── (dashboard)/                   # Authenticated shell
│   │   ├── layout.tsx                 # Reads session, renders sidebar
│   │   ├── admin/                     # Role-gated: ADMIN
│   │   ├── sales/                     # Role-gated: SALES
│   │   ├── seller/                    # Role-gated: SELLER
│   │   ├── employee/                  # Role-gated: EMPLOYEE
│   │   └── customer/                  # Role-gated: CUSTOMER (orders, addresses, profile, credit)
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   │   └── route.ts               # { GET, POST } = handlers from auth.ts
│   │   └── blobs/
│   │       └── [store]/[key]/
│   │           └── route.ts           # Signed blob serving for private stores only
│   └── layout.tsx                     # Root layout (fonts, providers)
│
├── components/
│   ├── ui/                            # shadcn/ui generated components (do not edit)
│   └── [domain]/                      # Domain-specific components (e.g., products/, orders/)
│
├── lib/
│   ├── auth/
│   │   └── roles.ts                   # Role helpers, requireRole(), hasRole()
│   ├── db/
│   │   └── prisma.ts                  # Singleton Prisma client
│   ├── payments/
│   │   ├── interface.ts               # PaymentProvider interface
│   │   └── razorpay.ts                # Razorpay implementation
│   ├── sms/
│   │   ├── interface.ts               # SmsProvider interface
│   │   └── msg91.ts                   # MSG91 / Twilio implementation
│   └── blobs/
│       └── client.ts                  # Netlify Blobs helpers (upload, getURL)
│
├── server/
│   ├── actions/                       # Server Actions (one file per domain)
│   │   ├── auth.actions.ts
│   │   ├── product.actions.ts
│   │   └── order.actions.ts
│   └── queries/                       # Read-only DB query functions (used by RSCs)
│       ├── product.queries.ts
│       └── order.queries.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── types/
│   ├── next-auth.d.ts                 # Module augmentation for Session & JWT
│   └── index.ts                       # Shared app-level TypeScript types
│
├── auth.config.ts                     # Edge-safe config: providers metadata, pages, session strategy
├── auth.ts                            # Full NextAuth config: imports auth.config.ts + adds Prisma adapter & authorize fns
├── middleware.ts                      # Edge middleware: imports auth.config.ts ONLY (never Prisma/bcrypt)
└── netlify.toml                       # @netlify/plugin-nextjs, Node 20
```

---

## 2. Domain Entities

The full entity model lives in prisma/schema.prisma. See MODELING_NOTES.md for design rationale.

**Role enum:** `CUSTOMER | SELLER | EMPLOYEE | SALES | ADMIN`

---

## 3. NextAuth v5 Setup

### Split-config pattern (required for Edge middleware)

Auth.js v5 running with Next.js + Netlify edge middleware requires a split config:

- **`auth.config.ts`** — Edge-safe. Contains provider shape (no `authorize`), `pages`, and `session` strategy. Must never import Prisma, bcryptjs, or `@netlify/blobs`.
- **`auth.ts`** — Node runtime only. Imports `authConfig`, spreads it, adds `PrismaAdapter`, full `authorize` functions, and the `jwt` callback that queries Prisma.
- **`middleware.ts`** — Imports from `auth.config.ts` only. **`middleware.ts` must never transitively import Prisma, bcryptjs, or @netlify/blobs.**

### auth.config.ts (root, Edge-safe)

```ts
// auth.config.ts
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    // Shape only — no authorize() here (would pull in Prisma/bcrypt)
    Credentials({ id: "credentials", credentials: { email: {}, password: {} } }),
    Credentials({ id: "phone-otp",   credentials: { phone: {}, otp: {} } }),
  ],
  callbacks: {
    // Edge-safe: reads JWT, no DB
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
```

### auth.ts (root, Node runtime)

```ts
// auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      id: "credentials",
      credentials: { email: {}, password: {} },
      async authorize(credentials) { /* validate, bcrypt.compare, return user */ },
    }),
    Credentials({
      id: "phone-otp",
      credentials: { phone: {}, otp: {} },
      async authorize(credentials) {
        // 1. Lookup OtpToken by phone
        // 2. Check expiresAt, used flag, attempts < 5
        // 3. sha256(otp + OTP_PEPPER) === codeHash
        // 4. Increment attempts on mismatch; mark used on success
        // 5. Return user or null
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
      // ── First sign-in: token.roles is absent ──────────────────────────────
      if (!token.roles) {
        if (user) { token.id = user.id as unknown as string; }
        const tokenId = token.id as string | undefined;
        if (!tokenId) return token;

        const [dbUser, userRoles] = await Promise.all([
          prisma.user.findUnique({ where: { id: tokenId }, select: { rolesUpdatedAt: true } }),
          prisma.userRole.findMany({ where: { userId: tokenId } }),
        ]);
        token.roles = userRoles.map(r => r.role);
        token.rolesUpdatedAt = dbUser?.rolesUpdatedAt?.getTime() ?? 0;
        token.lastRoleCheckAt = Date.now();
        return token;
      }

      // ── Within the 60 s window: skip DB entirely ──────────────────────────
      const lastCheck = (token.lastRoleCheckAt as number | undefined) ?? 0;
      if (Date.now() - lastCheck < 60_000) return token;

      // ── 60 s elapsed: check for stale roles ───────────────────────────────
      const tokenId = token.id as string | undefined;
      if (!tokenId) return token;

      const dbUser = await prisma.user.findUnique({
        where: { id: tokenId }, select: { rolesUpdatedAt: true },
      });
      const dbTs    = dbUser?.rolesUpdatedAt?.getTime() ?? 0;
      const tokenTs = (token.rolesUpdatedAt as number | undefined) ?? 0;
      if (dbTs > tokenTs) {
        const userRoles = await prisma.userRole.findMany({ where: { userId: tokenId } });
        token.roles = userRoles.map(r => r.role);
        token.rolesUpdatedAt = dbTs;
      }
      token.lastRoleCheckAt = Date.now();
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.roles = token.roles as string[];
      return session;
    },
  },
});
```

### Route Handler

```ts
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

### Reading the session in Server Components

```ts
import { auth } from "@/auth";

export default async function Page() {
  const session = await auth();      // returns null if unauthenticated
  const userId = session?.user.id;
  // pass userId directly to Prisma queries — never trust client-sent IDs
}
```

### TypeScript augmentation

```ts
// types/next-auth.d.ts
import { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string; roles: string[] } & DefaultSession["user"];
  }
}
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    roles: string[];
    rolesUpdatedAt: number;
  }
}
```

---

## 4. Role System

Roles are stored in the `UserRole` join table (one row per role per user). A user may hold multiple roles simultaneously (e.g., ADMIN + SELLER).

**Flow:**
1. `jwt` callback runs on every token refresh → re-fetches roles from Prisma only when `user.rolesUpdatedAt` is newer than `token.rolesUpdatedAt`.
2. `session` callback copies roles from token to `session.user.roles`.
3. Server Components call `auth()` → read `session.user.roles`.
4. Server Actions call `auth()` at the top of the action to authorise.
5. Middleware reads the JWT directly (no DB round-trip) to gate routes.

**Propagating role changes:** Whenever a UserRole row is created or deleted, update `user.rolesUpdatedAt = new Date()` in the same transaction. The next JWT refresh will pick up the new roles automatically.

**Staleness window:** The `jwt` callback re-checks `rolesUpdatedAt` at most once per 60 s per session. Worst-case propagation delay for a role grant or revocation is 60 s. This is acceptable for current traffic. If sub-second propagation is needed in future, replace `lastRoleCheckAt` gating with a Redis pub/sub invalidation signal.

**Role helper (lib/auth/roles.ts):**

```ts
export type Role = "CUSTOMER" | "SELLER" | "EMPLOYEE" | "SALES" | "ADMIN";

export function hasRole(roles: string[], ...required: Role[]): boolean {
  return required.some(r => roles.includes(r));
}

export function requireRole(roles: string[], ...required: Role[]): void {
  if (!hasRole(roles, ...required)) throw new Error("Forbidden");
}
```

---

## 5. Middleware Strategy

`middleware.ts` runs at the edge on every matched route. It imports **only** from `auth.config.ts` — never from `auth.ts` — to avoid pulling Prisma or bcryptjs into the edge bundle.

1. Wraps `authConfig` with `NextAuth()` to get an edge-safe `auth` middleware function.
2. Inspects `token.roles` from the JWT (no DB call at all).
3. Redirects to `/login` (unauthenticated) or `/unauthorized` (wrong role) as needed.
4. `(shop)` and `(auth)` routes are **not** in the matcher — they are publicly accessible.

> **Rule:** `middleware.ts` must never transitively import Prisma, bcryptjs, or @netlify/blobs.

```ts
// middleware.ts
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth: middleware } = NextAuth(authConfig);

const ROLE_ROUTES: Record<string, string[]> = {
  "/admin":    ["ADMIN"],
  "/sales":    ["SALES", "ADMIN"],
  "/seller":   ["SELLER", "ADMIN"],
  "/employee": ["EMPLOYEE", "ADMIN"],
  "/customer": ["CUSTOMER", "SELLER", "ADMIN"],
};

export default middleware((req) => {
  const { pathname } = req.nextUrl;
  const roles: string[] = (req.auth?.user as any)?.roles ?? [];

  // Unauthenticated: redirect to login
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  for (const [prefix, allowed] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      if (!roles.some(r => allowed.includes(r))) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }
  }
  return NextResponse.next();
});

export const config = {
  // (shop)/ and (auth)/ routes are intentionally excluded
  matcher: [
    "/admin/:path*",
    "/sales/:path*",
    "/seller/:path*",
    "/employee/:path*",
    "/customer/:path*",
  ],
};
```

---

## 6. Netlify-Specific Concerns

### Prisma + Short-lived Functions

Netlify Functions (serverless) create a new Node.js process per invocation. Direct TCP connections to Postgres are exhausted quickly. The solution is a **connection pooler** at the database level.

**Chosen approach: Neon connection pooler (PgBouncer-compatible)**
- Neon provides two connection strings per project: a direct URL and a pooled URL.
- No Prisma Data Proxy is needed; Prisma's `@prisma/client` talks directly to the pooler.

**prisma/schema.prisma datasource:**

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // pooled (PgBouncer) — used at runtime
  directUrl = env("DIRECT_URL")        // direct TCP — used only by `prisma migrate`
}
```

**Required environment variables:**

| Variable | Value | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://...?pgbouncer=true&connection_limit=5&pool_timeout=20` | Runtime queries (pooled) |
| `DIRECT_URL` | `postgresql://...` (no pooler) | `prisma migrate deploy` only |

**Why these params:**
- `pgbouncer=true` — disables Prisma's prepared statements, required for transaction-mode poolers (Neon/Supabase use PgBouncer in transaction mode).
- `connection_limit=5` — lets a single warm function instance handle modest concurrency without serialising all queries to one socket.
- `pool_timeout=20` — avoids instant failures during brief connection spikes; waits up to 20 s for a free slot before erroring.

**Singleton client (lib/db/prisma.ts):**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**netlify.toml:**

```toml
[build]
  command   = "npx prisma generate && npx prisma migrate deploy && next build"
  publish   = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"
```

> `migrate deploy` is safe to run on every build — it is a no-op when no pending migrations exist, and applies only approved migration SQL files (never auto-generates schema changes).

---

## 7. Netlify Blobs

### Store Names & Access Patterns

| Store name | Access | Contents | Served via |
|---|---|---|---|
| `product-images` | Public | Product photos | Direct CDN URL (no auth needed) |
| `shop-assets` | Public | Shop logos, banners | Direct CDN URL |
| `kyc-docs` | **Private** | KYC documents | Signed Route Handler (see below) |

### Upload (Server Action or Route Handler)

Domain models store an `assetId` FK to the `Asset` table — not a raw blob key. The upload flow is:
1. Store the file bytes in Netlify Blobs (with `contentType` in metadata).
2. Insert an `Asset` row recording `store`, `key`, `contentType`, `sizeBytes`, and `uploadedById`.
3. Persist the returned `asset.id` on the domain model (e.g. `Product.imageAssetId`).

```ts
import { getStore } from "@netlify/blobs";
import { prisma }   from "@/lib/db/prisma";

async function uploadProductImage(
  file: File,
  productId: string,
  uploadedById: string,
) {
  const store = getStore("product-images");
  const key   = `${productId}/${crypto.randomUUID()}`;
  const bytes = await file.arrayBuffer();

  // 1. Write bytes to Netlify Blobs
  await store.set(key, bytes, { metadata: { contentType: file.type } });

  // 2. Record the upload in the Asset table
  const asset = await prisma.asset.create({
    data: {
      store:       "product-images",
      key,
      contentType: file.type,
      sizeBytes:   bytes.byteLength,
      uploadedById,
    },
  });

  // 3. Persist assetId on the domain model
  await prisma.productImage.create({
    data: { productId, assetId: asset.id, sortOrder: 0 },
  });
}
```

KYC document upload follows the same pattern — store bytes → create `Asset` row → create `CreditApplicationAsset` join row linking the application to the asset.

### Serving Private Blobs (Route Handler)

```
GET /api/blobs/kyc-docs/[key]
```

Only stores listed in `ALLOWED_STORES` may be served through this handler. Public stores (`product-images`, `shop-assets`) must **never** be routed here — they are accessed via their direct CDN URLs. Content type is recovered from blob metadata via `getWithMetadata`.

```ts
// app/api/blobs/[store]/[key]/route.ts
import { auth }     from "@/auth";
import { getStore } from "@netlify/blobs";
import { NextResponse } from "next/server";

// Only private stores. Public stores use direct CDN URLs.
const ALLOWED_STORES = new Set(["kyc-docs"]);

const STORE_ROLES: Record<string, string[]> = {
  "kyc-docs": ["ADMIN", "EMPLOYEE"],
};

export async function GET(
  req: Request,
  { params }: { params: { store: string; key: string } }
) {
  if (!ALLOWED_STORES.has(params.store)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const allowedRoles = STORE_ROLES[params.store] ?? [];
  if (!session.user.roles.some(r => allowedRoles.includes(r))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const store  = getStore(params.store);
  const result = await store.getWithMetadata(params.key, { type: "arrayBuffer" });
  if (!result) return new NextResponse("Not Found", { status: 404 });

  const contentType = result.metadata?.contentType ?? "application/octet-stream";

  return new NextResponse(result.data, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
```

---

## Verification Plan (post-implementation)

- `prisma migrate dev` succeeds using `DIRECT_URL`.
- `next build` succeeds locally and on Netlify CI.
- Sign in with email+password → JWT contains `id`, `roles`, and `rolesUpdatedAt`.
- Sign in with phone OTP → same JWT shape.
- After 5 failed OTP attempts → further attempts rejected without checking the code.
- Visiting `/admin` as CUSTOMER role → redirected to `/unauthorized`.
- Visiting `/cart` unauthenticated → renders normally (not redirected).
- Upload a product image → key stored in DB, CDN URL resolves.
- Fetch `/api/blobs/product-images/[key]` → 404 (not in ALLOWED_STORES).
- Fetch `/api/blobs/kyc-docs/[key]` as CUSTOMER → 403.
- Fetch same route as ADMIN → returns blob bytes with correct Content-Type.
- Grant a new role to a user → update `rolesUpdatedAt` in the same transaction → next request JWT refresh picks up new role.
