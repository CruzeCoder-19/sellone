export type AssetRef = {
  assetId: string;
  key: string;
  store: string;
  contentType: string;
};

export type VariantSummary = {
  id: string;
  sku: string;
  name: string;
  priceDeltaInPaise: number;
  stock: number;
};

export type TierPriceRow = {
  minQty: number;
  priceInPaise: number;
};

export type CategoryBreadcrumb = {
  id: string;
  name: string;
  slug: string;
};

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: CategoryNode[];
  productCount: number;
};

export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  basePriceInPaise: number;
  moq: number;
  status: string;
  primaryImage: { assetId: string; key: string; store: string } | null;
  brand: { name: string; slug: string } | null;
  tierPriceCount: number;
};

export type ProductDetail = ProductListItem & {
  stock: number;
  description: string | null;
  sku: string;
  sellerShop: { id: string; slug: string; name: string } | null;
  images: AssetRef[];
  variants: VariantSummary[];
  tierPrices: TierPriceRow[];
  categories: CategoryBreadcrumb[];
};

export type ProductFilters = {
  categorySlug?: string;
  brandSlug?: string;
  inStockOnly?: boolean;
  sortBy?: "newest" | "price-asc" | "price-desc" | "name";
  page?: number;
  perPage?: number;
};
