import type { MetadataRoute } from "next";
import { getCategoryTree } from "@/server/queries/category.queries";
import { getActiveProductSlugsForSitemap } from "@/server/queries/product.queries";
import { getPublishedPostSlugsForSitemap } from "@/server/queries/blog.queries";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://wolsell.com";

function url(path: string) {
  return `${BASE}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tree, products, posts] = await Promise.all([
    getCategoryTree(),
    getActiveProductSlugsForSitemap(),
    getPublishedPostSlugsForSitemap(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: url("/"), lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: url("/shop"), lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: url("/blog"), lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: url("/about"), lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: url("/contact"), lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: url("/faqs"), lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: url("/delivery-return"), lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: url("/sell-with-us"), lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  // Flatten category tree (all levels)
  function flattenSlugs(nodes: typeof tree): string[] {
    return nodes.flatMap((n) => [n.slug, ...flattenSlugs(n.children)]);
  }
  const categorySlugs = flattenSlugs(tree);

  const categoryRoutes: MetadataRoute.Sitemap = categorySlugs.map((slug) => ({
    url: url(`/product-category/${slug}`),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: url(`/product/${p.slug}`),
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const blogRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: url(`/blog/${p.slug}`),
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...blogRoutes];
}
