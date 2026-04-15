import Link from "next/link";
import Image from "next/image";
import { getPublicAssetUrl } from "@/lib/blobs/url";
import type { AssetRef } from "@/types/catalog";

interface CategoryTileProps {
  category: {
    name: string;
    slug: string;
    image?: AssetRef | null;
    productCount: number;
  };
}

export function CategoryTile({ category }: CategoryTileProps) {
  const imageSrc = category.image ? getPublicAssetUrl(category.image) : "/placeholder.svg";

  return (
    <Link
      href={`/product-category/${category.slug}`}
      className="group relative block aspect-square overflow-hidden rounded-lg bg-gray-100"
    >
      <Image
        src={imageSrc}
        alt={category.name}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 14vw"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Text */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="truncate text-sm font-semibold leading-tight text-white">
          {category.name}
        </p>
        <p className="mt-0.5 text-xs text-gray-300">{category.productCount} products</p>
      </div>
    </Link>
  );
}
