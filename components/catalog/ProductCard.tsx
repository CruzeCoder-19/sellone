import Link from "next/link";
import Image from "next/image";
import { getPublicAssetUrl } from "@/lib/blobs/url";
import { formatPaise, formatPriceRange } from "@/lib/format";
import { CompareButton } from "@/components/catalog/CompareButton";
import type { ProductListItem } from "@/types/catalog";

interface ProductCardProps {
  product: ProductListItem;
}

export function ProductCard({ product }: ProductCardProps) {
  const imageSrc = product.primaryImage
    ? getPublicAssetUrl(product.primaryImage)
    : "/placeholder.svg";

  const priceLabel =
    product.tierPriceCount > 0
      ? formatPriceRange(product.basePriceInPaise, product.basePriceInPaise)
      : formatPaise(product.basePriceInPaise);

  return (
    <div className="relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
        <Image
          src={imageSrc}
          alt={product.name}
          width={600}
          height={900}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="h-full w-full object-cover"
        />
        {product.status === "SOLD_OUT" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded bg-white px-3 py-1 text-sm font-semibold text-gray-800">
              Sold out
            </span>
          </div>
        )}
        <div className="absolute bottom-2 right-2">
          <CompareButton productId={product.id} variantId={null} />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.brand && (
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            {product.brand.name}
          </p>
        )}

        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-blue-600"
        >
          {product.name}
        </Link>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-bold text-gray-900">{priceLabel}</span>
          {product.moq > 1 && (
            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              MOQ {product.moq}+
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
