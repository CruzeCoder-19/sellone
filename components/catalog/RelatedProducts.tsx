import { listRelatedProducts } from "@/server/queries/product.queries";
import { ProductCard } from "@/components/catalog/ProductCard";
import type { ProductDetail } from "@/types/catalog";

interface RelatedProductsProps {
  product: ProductDetail;
  categoryId: string | null;
}

export async function RelatedProducts({ product, categoryId }: RelatedProductsProps) {
  if (!categoryId) return null;

  const related = await listRelatedProducts(product.id, categoryId, 4);
  if (related.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xl font-bold text-gray-900">You might also like</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
