import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// seedCategories
// ─────────────────────────────────────────────────────────────────────────────

async function seedCategories(): Promise<Map<string, string>> {
  type CategoryDef = { name: string; slug: string; parentSlug?: string };

  const categories: CategoryDef[] = [
    // Top-level
    { name: "Electrical", slug: "electrical" },
    { name: "Hardware", slug: "hardware" },
    { name: "Kitchen", slug: "kitchen" },
    { name: "Sanitary", slug: "sanitary" },
    { name: "Paints", slug: "paints" },
    { name: "Men Shirts", slug: "men-shirts" },
    { name: "Sweatshirts", slug: "sweatshirts" },
    // Children
    { name: "Switches", slug: "switches", parentSlug: "electrical" },
    { name: "Door Hardware", slug: "door-hardware", parentSlug: "hardware" },
    { name: "Handles", slug: "handles", parentSlug: "hardware" },
    { name: "Hinges", slug: "hinges", parentSlug: "hardware" },
    { name: "Sinks", slug: "sinks", parentSlug: "kitchen" },
    { name: "Faucets", slug: "faucets", parentSlug: "sanitary" },
    { name: "Showers", slug: "showers", parentSlug: "sanitary" },
    { name: "Emulsion", slug: "emulsion", parentSlug: "paints" },
  ];

  // Pass 1: parents (no parentSlug)
  const slugToId = new Map<string, string>();
  for (const cat of categories.filter((c) => !c.parentSlug)) {
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: { name: cat.name, slug: cat.slug },
      update: { name: cat.name },
    });
    slugToId.set(cat.slug, row.id);
  }

  // Pass 2: children
  for (const cat of categories.filter((c) => !!c.parentSlug)) {
    const parentId = slugToId.get(cat.parentSlug!);
    if (!parentId) throw new Error(`Parent not found for slug: ${cat.parentSlug}`);
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: { name: cat.name, slug: cat.slug, parentId },
      update: { name: cat.name, parentId },
    });
    slugToId.set(cat.slug, row.id);
  }

  return slugToId;
}

// ─────────────────────────────────────────────────────────────────────────────
// seedBrands
// ─────────────────────────────────────────────────────────────────────────────

async function seedBrands(): Promise<Map<string, string>> {
  const brands = [
    { name: "Wolsell Pro", slug: "wolsell-pro" },
    { name: "BuildMate", slug: "buildmate" },
    { name: "HomeFix", slug: "homefix" },
    { name: "PaintCo", slug: "paintco" },
    { name: "PureWear", slug: "purewear" },
  ];

  const slugToId = new Map<string, string>();
  for (const b of brands) {
    const row = await prisma.brand.upsert({
      where: { slug: b.slug },
      create: { name: b.name, slug: b.slug },
      update: { name: b.name },
    });
    slugToId.set(b.slug, row.id);
  }
  return slugToId;
}

// ─────────────────────────────────────────────────────────────────────────────
// seedAdminUser
// ─────────────────────────────────────────────────────────────────────────────

async function seedAdminUser(now: Date): Promise<string> {
  const email = "admin@wolsell.local";
  const passwordHash = await bcrypt.hash("admin1234", 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Wolsell Admin",
      passwordHash,
      emailVerified: now,
      rolesUpdatedAt: now,
    },
    update: {},
  });

  // Roles
  for (const role of ["ADMIN", "CUSTOMER"] as const) {
    await prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role } },
      create: { userId: user.id, role },
      update: {},
    });
  }

  // Cart / Wishlist / CompareList
  await prisma.cart.createMany({ data: [{ userId: user.id }], skipDuplicates: true });
  await prisma.wishlist.createMany({ data: [{ userId: user.id }], skipDuplicates: true });
  await prisma.compareList.createMany({ data: [{ userId: user.id }], skipDuplicates: true });

  return user.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// seedSampleSeller
// ─────────────────────────────────────────────────────────────────────────────

async function seedSampleSeller(now: Date): Promise<{ userId: string; shopId: string }> {
  const email = "seller@wolsell.local";
  const passwordHash = await bcrypt.hash("seller1234", 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Demo Seller",
      passwordHash,
      emailVerified: now,
      rolesUpdatedAt: now,
    },
    update: {},
  });

  for (const role of ["SELLER", "CUSTOMER"] as const) {
    await prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role } },
      create: { userId: user.id, role },
      update: {},
    });
  }

  await prisma.cart.createMany({ data: [{ userId: user.id }], skipDuplicates: true });
  await prisma.wishlist.createMany({ data: [{ userId: user.id }], skipDuplicates: true });
  await prisma.compareList.createMany({ data: [{ userId: user.id }], skipDuplicates: true });

  const shop = await prisma.shop.upsert({
    where: { slug: "demo-traders" },
    create: {
      ownerId: user.id,
      name: "Demo Traders",
      slug: "demo-traders",
      description: "Sample seller shop for development and testing.",
      businessAddress: "123 Market Street, Mumbai, MH 400001",
      phone: "+919999900001",
      email: "seller@wolsell.local",
      status: "ACTIVE",
      verifiedAt: now,
    },
    update: {},
  });

  return { userId: user.id, shopId: shop.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// seedSampleProducts
// ─────────────────────────────────────────────────────────────────────────────

async function seedSampleProducts(
  categoryIds: Map<string, string>,
  brandIds: Map<string, string>,
  adminId: string,
  shopId: string,
): Promise<void> {
  type ProductDef = {
    slug: string;
    name: string;
    description: string;
    sku: string;
    brandSlug: string;
    categorySlug: string;
    basePriceInPaise: number;
    moq: number;
    stock: number;
    status: "ACTIVE" | "SOLD_OUT";
    sellerShopId: string | null;
    tierPrices?: { minQty: number; priceInPaise: number }[];
    variants?: { sku: string; name: string; priceDeltaInPaise: number; stock: number }[];
  };

  const products: ProductDef[] = [
    {
      slug: "modular-switch-6a",
      name: "Modular Switch 6A",
      description: "Standard 6A modular switch for residential wiring.",
      sku: "ELC-SW-6A-001",
      brandSlug: "buildmate",
      categorySlug: "switches",
      basePriceInPaise: 12000,
      moq: 1,
      stock: 500,
      status: "ACTIVE",
      sellerShopId: null,
    },
    {
      slug: "concealed-switch-16a",
      name: "Concealed Switch 16A",
      description: "Heavy-duty 16A concealed switch for high-load appliances.",
      sku: "ELC-SW-16A-002",
      brandSlug: "buildmate",
      categorySlug: "switches",
      basePriceInPaise: 25000,
      moq: 1,
      stock: 300,
      status: "ACTIVE",
      sellerShopId: null,
    },
    {
      slug: "door-handle-ss-lever",
      name: "Door Handle SS Lever",
      description: "Stainless steel lever-type door handle, brushed finish.",
      sku: "HDW-HDL-SS-001",
      brandSlug: "homefix",
      categorySlug: "handles",
      basePriceInPaise: 58000,
      moq: 1,
      stock: 150,
      status: "ACTIVE",
      sellerShopId: shopId,
    },
    {
      slug: "butt-hinge-4inch-ss",
      name: "Butt Hinge 4\" SS",
      description: "4-inch stainless steel butt hinge, pack of 2.",
      sku: "HDW-HNG-4SS-001",
      brandSlug: "homefix",
      categorySlug: "hinges",
      basePriceInPaise: 18000,
      moq: 10,
      stock: 1000,
      status: "ACTIVE",
      sellerShopId: shopId,
    },
    {
      slug: "stainless-steel-sink-24x18",
      name: "Stainless Steel Sink 24x18",
      description: "Single bowl kitchen sink, 304-grade SS, 24\" × 18\".",
      sku: "KIT-SNK-SS-001",
      brandSlug: "wolsell-pro",
      categorySlug: "sinks",
      basePriceInPaise: 450000,
      moq: 1,
      stock: 40,
      status: "ACTIVE",
      sellerShopId: null,
    },
    {
      slug: "single-lever-basin-faucet",
      name: "Single Lever Basin Faucet",
      description: "Chrome single-lever mixer tap for wash basins.",
      sku: "SAN-FAU-SL-001",
      brandSlug: "buildmate",
      categorySlug: "faucets",
      basePriceInPaise: 122000,
      moq: 1,
      stock: 80,
      status: "ACTIVE",
      sellerShopId: null,
    },
    {
      slug: "rain-shower-set",
      name: "Rain Shower Set",
      description: "Overhead rain shower with 12\" round head and arm, chrome finish.",
      sku: "SAN-SHW-RAIN-001",
      brandSlug: "wolsell-pro",
      categorySlug: "showers",
      basePriceInPaise: 320000,
      moq: 1,
      stock: 30,
      status: "ACTIVE",
      sellerShopId: null,
    },
    {
      slug: "interior-emulsion-20l",
      name: "Interior Emulsion 20L",
      description: "Premium washable interior wall emulsion, white base, 20L.",
      sku: "PNT-EMU-INT-20L",
      brandSlug: "paintco",
      categorySlug: "emulsion",
      basePriceInPaise: 280000,
      moq: 1,
      stock: 200,
      status: "ACTIVE",
      sellerShopId: null,
    },
    {
      slug: "exterior-emulsion-20l",
      name: "Exterior Emulsion 20L",
      description: "Weather-resistant exterior emulsion, white base, 20L.",
      sku: "PNT-EMU-EXT-20L",
      brandSlug: "paintco",
      categorySlug: "emulsion",
      basePriceInPaise: 320000,
      moq: 1,
      stock: 0,
      status: "SOLD_OUT",
      sellerShopId: null,
    },
    {
      slug: "polo-shirt-bulk",
      name: "Polo Shirt (Bulk)",
      description: "Cotton polo shirt for corporate and uniform bulk orders.",
      sku: "APR-POL-BULK-001",
      brandSlug: "purewear",
      categorySlug: "men-shirts",
      basePriceInPaise: 150000,
      moq: 50,
      stock: 5000,
      status: "ACTIVE",
      sellerShopId: shopId,
      tierPrices: [
        { minQty: 50, priceInPaise: 150000 },
        { minQty: 100, priceInPaise: 130000 },
        { minQty: 200, priceInPaise: 110000 },
      ],
      variants: [
        { sku: "APR-POL-BULK-M", name: "Size M", priceDeltaInPaise: 0, stock: 2500 },
        { sku: "APR-POL-BULK-L", name: "Size L", priceDeltaInPaise: 0, stock: 2500 },
      ],
    },
    {
      slug: "oxford-button-down",
      name: "Oxford Button-Down Shirt",
      description: "Classic Oxford weave button-down shirt, available in S/M/L.",
      sku: "APR-OXF-BTN-001",
      brandSlug: "purewear",
      categorySlug: "men-shirts",
      basePriceInPaise: 89900,
      moq: 1,
      stock: 120,
      status: "ACTIVE",
      sellerShopId: null,
      variants: [
        { sku: "APR-OXF-BTN-S", name: "Size S", priceDeltaInPaise: 0, stock: 40 },
        { sku: "APR-OXF-BTN-M", name: "Size M", priceDeltaInPaise: 0, stock: 40 },
        { sku: "APR-OXF-BTN-L", name: "Size L", priceDeltaInPaise: 0, stock: 40 },
      ],
    },
    {
      slug: "fleece-sweatshirt",
      name: "Fleece Sweatshirt",
      description: "Heavyweight 320gsm fleece crewneck sweatshirt.",
      sku: "APR-SWT-FLC-001",
      brandSlug: "purewear",
      categorySlug: "sweatshirts",
      basePriceInPaise: 120000,
      moq: 1,
      stock: 200,
      status: "ACTIVE",
      sellerShopId: null,
    },
  ];

  for (const p of products) {
    const brandId = brandIds.get(p.brandSlug);
    const categoryId = categoryIds.get(p.categorySlug);
    if (!brandId) throw new Error(`Brand not found: ${p.brandSlug}`);
    if (!categoryId) throw new Error(`Category not found: ${p.categorySlug}`);

    // Upsert product
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        sku: p.sku,
        brandId,
        sellerShopId: p.sellerShopId,
        basePriceInPaise: p.basePriceInPaise,
        moq: p.moq,
        stock: p.stock,
        status: p.status,
      },
      update: {
        name: p.name,
        description: p.description,
        basePriceInPaise: p.basePriceInPaise,
        moq: p.moq,
        stock: p.stock,
        status: p.status,
      },
    });

    // ProductCategory (idempotent via @@id composite)
    await prisma.productCategory.upsert({
      where: { productId_categoryId: { productId: product.id, categoryId } },
      create: { productId: product.id, categoryId },
      update: {},
    });

    // Asset + ProductImage (upsert asset by store+key, then productImage)
    const asset = await prisma.asset.upsert({
      where: { store_key: { store: "product-images", key: `seed/${p.slug}.jpg` } },
      create: {
        store: "product-images",
        key: `seed/${p.slug}.jpg`,
        contentType: "image/jpeg",
        sizeBytes: 0,
        uploadedById: adminId,
      },
      update: {},
    });

    // ProductImage — check existence before creating to stay idempotent
    const existingImage = await prisma.productImage.findFirst({
      where: { productId: product.id, assetId: asset.id },
    });
    if (!existingImage) {
      await prisma.productImage.create({
        data: { productId: product.id, assetId: asset.id, sortOrder: 0 },
      });
    }

    // Tier prices — delete and recreate on re-seed for simplicity
    if (p.tierPrices?.length) {
      await prisma.tierPrice.deleteMany({ where: { productId: product.id } });
      await prisma.tierPrice.createMany({
        data: p.tierPrices.map((t) => ({
          productId: product.id,
          minQty: t.minQty,
          priceInPaise: t.priceInPaise,
        })),
      });
    }

    // Variants — upsert by sku
    if (p.variants?.length) {
      for (const v of p.variants) {
        await prisma.productVariant.upsert({
          where: { sku: v.sku },
          create: {
            productId: product.id,
            sku: v.sku,
            name: v.name,
            priceDeltaInPaise: v.priceDeltaInPaise,
            stock: v.stock,
          },
          update: { name: v.name, priceDeltaInPaise: v.priceDeltaInPaise, stock: v.stock },
        });
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// seedSampleCustomer
// ─────────────────────────────────────────────────────────────────────────────

async function seedSampleCustomer(now: Date): Promise<string> {
  const email = "customer@wolsell.local";
  const passwordHash = await bcrypt.hash("customer1234", 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Sample Customer",
      passwordHash,
      emailVerified: now,
      rolesUpdatedAt: now,
    },
    update: {},
  });

  await prisma.userRole.upsert({
    where: { userId_role: { userId: user.id, role: "CUSTOMER" } },
    create: { userId: user.id, role: "CUSTOMER" },
    update: {},
  });

  await prisma.cart.createMany({ data: [{ userId: user.id }], skipDuplicates: true });
  await prisma.wishlist.createMany({ data: [{ userId: user.id }], skipDuplicates: true });
  await prisma.compareList.createMany({ data: [{ userId: user.id }], skipDuplicates: true });

  return user.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// seedSampleCreditAccount
// ─────────────────────────────────────────────────────────────────────────────

async function seedSampleCreditAccount(
  customerId: string,
  adminId: string,
  now: Date,
): Promise<void> {
  // Upsert the credit account; on re-seed, bring outstanding up to ₹12,500
  const account = await prisma.creditAccount.upsert({
    where: { userId: customerId },
    create: {
      userId: customerId,
      status: "APPROVED",
      limitInPaise: 5_000_000,      // ₹50,000
      outstandingInPaise: 1_250_000, // ₹12,500
      approvedById: adminId,
      approvedAt: now,
    },
    update: {
      outstandingInPaise: 1_250_000,
    },
  });

  // Idempotent: seed CreditApplication only if none exists for this user
  const existingApp = await prisma.creditApplication.findFirst({
    where: { userId: customerId },
  });
  if (!existingApp) {
    await prisma.creditApplication.create({
      data: {
        userId: customerId,
        status: "APPROVED",
        legalName: "Sample Trader Co.",
        panNumber: "ABCDE1234F",
        gstin: "29ABCDE1234F1ZV",
        businessAddress: "123 Market Street, Mumbai 400001",
        monthlyTurnoverInPaise: 2_000_000, // ₹20,000
        submittedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        reviewedAt: now,
        reviewedById: adminId,
      },
    });
  }

  // Idempotent: seed CreditTransactions only if none exist for this account
  const existingTxCount = await prisma.creditTransaction.count({
    where: { creditAccountId: account.id },
  });
  if (existingTxCount === 0) {
    // Link to a seeded order if one exists for this customer; otherwise null
    // TODO: link to seeded order when available
    const existingOrder = await prisma.order.findFirst({
      where: { customerId },
      select: { id: true },
    });

    await prisma.creditTransaction.createMany({
      data: [
        {
          creditAccountId: account.id,
          type: "CHARGE",
          status: "CONFIRMED",
          amountInPaise: 1_250_000, // ₹12,500
          relatedOrderId: existingOrder?.id ?? null,
          createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        },
        {
          creditAccountId: account.id,
          type: "REPAYMENT",
          status: "PENDING_VERIFICATION",
          amountInPaise: 500_000, // ₹5,000
          method: "UPI",
          utrReference: "UTR123456789",
          createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        },
      ],
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("🌱 Starting seed...");
  const now = new Date();

  const categoryIds = await seedCategories();
  console.log(`  ✓ categories (${categoryIds.size} rows)`);

  const brandIds = await seedBrands();
  console.log(`  ✓ brands (${brandIds.size} rows)`);

  const adminId = await seedAdminUser(now);
  console.log("  ✓ admin user");

  const { shopId } = await seedSampleSeller(now);
  console.log("  ✓ sample seller + shop");

  await seedSampleProducts(categoryIds, brandIds, adminId, shopId);
  console.log("  ✓ sample products (12 products, 12 assets, 12 images)");

  const customerId = await seedSampleCustomer(now);
  console.log("  ✓ sample customer");

  await seedSampleCreditAccount(customerId, adminId, now);
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
