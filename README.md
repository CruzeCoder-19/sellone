# Wolsell — B2B Wholesale Marketplace

Wolsell is a full-stack B2B wholesale marketplace built on Next.js 16. Buyers browse bulk-priced hardware, sanitary, electrical, paint, and apparel products. Sellers list products, manage inventory, and fulfill orders. Employees manage credit, admins run the whole platform.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | PostgreSQL via Supabase (Mumbai) |
| ORM | Prisma |
| Auth | NextAuth v5 (credentials + OTP) |
| Email | Nodemailer v7 |
| File storage | Supabase Storage (via `/api/blobs`) |
| Notifications | Sonner toast |

## Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd wolsell

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Fill in DATABASE_URL, DIRECT_URL, AUTH_SECRET, OTP_PEPPER, etc.

# 4. Generate Prisma client
npx prisma generate

# 5. Push schema to database (dev)
npx prisma db push

# 6. Seed database
npx prisma db seed

# 7. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Test Accounts

| Role | Email | Password |
|---|---|---|
| Customer | `customer@wolsell.local` | `customer1234` |
| Seller | `seller@wolsell.local` | `seller1234` |
| Employee | `employee@wolsell.local` | `employee1234` |
| Sales | `sales@wolsell.local` | `sales1234` |
| Admin | `admin@wolsell.local` | `admin1234` |

## Folder Structure

```
wolsell/
├── app/                   # Next.js App Router pages
│   ├── (shop)/            # Public storefront (/, /shop, /blog, /product/...)
│   ├── (dashboard)/       # Auth-protected dashboards
│   │   ├── admin/         # Admin panel
│   │   ├── seller/        # Seller product & order management
│   │   ├── employee/      # Employee check-in & credit management
│   │   ├── sales/         # Sales leads & leaderboard
│   │   └── customer/      # Customer orders, wishlist, credit
│   └── api/               # Route handlers (blobs, auth, OTP)
├── components/            # React components (no Prisma)
│   ├── admin/
│   ├── catalog/
│   ├── seller/
│   └── shop/
├── server/
│   ├── actions/           # Server Actions (mutations)
│   └── queries/           # Data fetching functions
├── lib/                   # Shared utilities (auth, db, email, format)
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── types/                 # Shared TypeScript types
```

## Available Scripts

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # ESLint
npx prisma studio # Browse database in browser
```
