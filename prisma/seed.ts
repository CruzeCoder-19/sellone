// prisma/seed.ts
// Structure only — function bodies contain TODO stubs.
// Real seed data will be added in a subsequent prompt.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Seed functions (called in dependency order by main())
// ─────────────────────────────────────────────────────────────────────────────

/**
 * No-op in Prisma — Role is a DB enum and requires no seeded rows.
 * This function exists as a placeholder and documentation checkpoint.
 */
async function seedRoles(): Promise<void> {
  // TODO: validate that all Role enum values are present in the DB (sanity check only)
}

/**
 * Seed the top-level and second-level product categories.
 * Creates: Electronics, Apparel, Home & Kitchen, Industrial Supplies (+ children).
 */
async function seedCategories(): Promise<void> {
  // TODO: upsertMany Category rows with slug-keyed idempotent upserts
}

/**
 * Seed sample brand records used by the sample products.
 * Creates: 2–3 placeholder brands with slugs and no logos.
 */
async function seedBrands(): Promise<void> {
  // TODO: upsertMany Brand rows
}

/**
 * Seed the platform admin user.
 * Creates: one User with ADMIN role, email+password credentials (bcrypt-hashed).
 * Credentials come from SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD env vars.
 */
async function seedAdminUser(): Promise<void> {
  // TODO: create User, assign UserRole ADMIN, bump rolesUpdatedAt in same tx
}

/**
 * Seed one sample seller with a Shop.
 * Creates: User (SELLER role) + Shop (status ACTIVE, verified).
 */
async function seedSampleSeller(): Promise<void> {
  // TODO: create User, assign UserRole SELLER, create Shop linked to user
}

/**
 * Seed sample products under the seller's shop.
 * Creates: 5–10 Products across 2 categories, each with 1–3 variants and tier prices.
 * Skips image assets (no Netlify connection in seed context).
 */
async function seedSampleProducts(): Promise<void> {
  // TODO: create Product, ProductCategory, ProductVariant, TierPrice rows
  // depends on: seedCategories, seedBrands, seedSampleSeller
}

/**
 * Seed one sample customer user with an address and a pre-populated cart.
 * Creates: User (CUSTOMER role) + Address (isDefault=true) + Cart with 2 CartItems.
 */
async function seedSampleCustomer(): Promise<void> {
  // TODO: create User, UserRole CUSTOMER, Address, Cart, CartItems
  // depends on: seedSampleProducts
}

/**
 * Seed a CreditAccount (APPROVED) for the sample customer with a modest limit.
 * Creates: CreditAccount linked to sample customer, approved by admin user.
 */
async function seedSampleCreditAccount(): Promise<void> {
  // TODO: create CreditAccount with status APPROVED, limitInPaise, approvedById = admin id
  // depends on: seedAdminUser, seedSampleCustomer
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("🌱 Starting seed...");

  await seedRoles();
  console.log("  ✓ roles");

  await seedCategories();
  console.log("  ✓ categories");

  await seedBrands();
  console.log("  ✓ brands");

  await seedAdminUser();
  console.log("  ✓ admin user");

  await seedSampleSeller();
  console.log("  ✓ sample seller + shop");

  await seedSampleProducts();
  console.log("  ✓ sample products");

  await seedSampleCustomer();
  console.log("  ✓ sample customer");

  await seedSampleCreditAccount();
  console.log("  ✓ sample credit account");

  console.log("🌱 Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
