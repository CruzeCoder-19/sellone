import type { TierPriceRow } from "@/types/catalog";

const qtyFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** Formats a quantity with Indian numbering. e.g. 1200 → "1,200" */
export function formatQty(n: number): string {
  return qtyFormatter.format(n);
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

/** Formats a paise amount as an INR string. e.g. 122000 → "₹1,220.00" */
export function formatPaise(paise: number): string {
  return inrFormatter.format(paise / 100);
}

/**
 * Returns "₹449.00 – ₹599.00" when min !== max, otherwise formatPaise(min).
 */
export function formatPriceRange(min: number, max: number): string {
  return min !== max ? `${formatPaise(min)} – ${formatPaise(max)}` : formatPaise(min);
}

/**
 * Returns the effective unit price in paise given a quantity and tier price table.
 * - If no tiers exist or quantity is below the lowest minQty, returns basePriceInPaise.
 * - Otherwise returns the highest tier where minQty <= quantity.
 */
export function calculateEffectivePrice(
  basePriceInPaise: number,
  tierPrices: TierPriceRow[],
  quantity: number,
): number {
  const sorted = [...tierPrices].sort((a, b) => a.minQty - b.minQty);
  if (!sorted.length || quantity < sorted[0].minQty) return basePriceInPaise;
  let effective = basePriceInPaise;
  for (const tier of sorted) {
    if (quantity >= tier.minQty) effective = tier.priceInPaise;
  }
  return effective;
}
