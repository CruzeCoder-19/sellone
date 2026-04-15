"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { calculateEffectivePrice, formatPaise } from "@/lib/format";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { AddToWishlistButton } from "@/components/cart/AddToWishlistButton";
import type { ProductDetail } from "@/types/catalog";

interface ProductPurchasePanelProps {
  product: ProductDetail;
}

export function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const firstVariantId = product.variants[0]?.id ?? null;
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(firstVariantId);
  const [quantity, setQuantity] = useState(product.moq);

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) ?? null;
  const effectiveStock = selectedVariant ? selectedVariant.stock : product.stock;
  const isSoldOut = product.status === "SOLD_OUT";

  const effectivePrice = calculateEffectivePrice(
    product.basePriceInPaise,
    product.tierPrices,
    quantity,
  );
  const totalPrice = effectivePrice * quantity;

  const isDisabled = isSoldOut || quantity < product.moq || quantity > effectiveStock;

  function decrement() {
    setQuantity((q) => Math.max(product.moq, q - 1));
  }

  function increment() {
    setQuantity((q) => Math.min(effectiveStock, q + 1));
  }

  function handleQtyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) setQuantity(val);
  }

  return (
    <div className="space-y-4">
      {/* Variant selector */}
      {product.variants.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Variant</label>
          <select
            value={selectedVariantId ?? ""}
            onChange={(e) => setSelectedVariantId(e.target.value || null)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {product.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Live price */}
      <div>
        <p className="text-xs text-gray-500">Price per unit</p>
        <p className="text-3xl font-extrabold text-gray-900">{formatPaise(effectivePrice)}</p>
        <p className="mt-1 text-sm text-gray-500">
          Total: <span className="font-semibold text-gray-800">{formatPaise(totalPrice)}</span>
        </p>
      </div>

      {/* Quantity input */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Quantity</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={decrement}
            disabled={quantity <= product.moq}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="number"
            value={quantity}
            onChange={handleQtyChange}
            min={product.moq}
            max={effectiveStock}
            className="w-20 rounded-md border border-gray-300 px-3 py-2 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={increment}
            disabled={quantity >= effectiveStock}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <AddToCartButton
          productId={product.id}
          variantId={selectedVariantId}
          quantity={quantity}
          disabled={isDisabled}
        />
        <AddToWishlistButton
          productId={product.id}
          variantId={selectedVariantId}
        />
      </div>

      {/* Info line */}
      <div className="space-y-1 text-xs text-gray-500">
        {product.moq > 1 && <p>MOQ: {product.moq} units</p>}
        {isSoldOut ? (
          <p className="font-medium text-red-600">Out of stock</p>
        ) : (
          <p>In stock: {effectiveStock} units</p>
        )}
        <p>
          Sold by:{" "}
          {product.sellerShop ? (
            <Link
              href={`/shop/${product.sellerShop.slug}`}
              className="font-medium text-blue-600 hover:underline"
            >
              {product.sellerShop.name}
            </Link>
          ) : (
            "Wolsell"
          )}
        </p>
      </div>
    </div>
  );
}
