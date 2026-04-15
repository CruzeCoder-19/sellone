"use client";

import { useState } from "react";
import Image from "next/image";
import { getPublicAssetUrl } from "@/lib/blobs/url";
import type { AssetRef } from "@/types/catalog";

interface ProductGalleryProps {
  images: AssetRef[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const srcs =
    images.length > 0
      ? images.map((img) => getPublicAssetUrl(img))
      : ["/placeholder.svg"];

  const [activeIndex, setActiveIndex] = useState(0);
  const activeSrc = srcs[activeIndex] ?? "/placeholder.svg";

  return (
    <div className="flex flex-col gap-3 md:flex-row-reverse">
      {/* Thumbnail strip — only when more than one image */}
      {srcs.length > 1 && (
        <div className="flex flex-row gap-2 overflow-x-auto md:flex-col md:overflow-x-visible md:w-20">
          {srcs.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded md:h-20 md:w-20 ${
                i === activeIndex
                  ? "border-2 border-blue-600"
                  : "border border-gray-200 hover:border-gray-400"
              }`}
            >
              <Image
                src={src}
                alt={`${productName} view ${i + 1}`}
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main image */}
      <div className="relative flex-1 aspect-square overflow-hidden rounded-lg bg-gray-100">
        <Image
          src={activeSrc}
          alt={productName}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
