import { formatPaise } from "@/lib/format";
import type { TierPriceRow } from "@/types/catalog";

interface TierPriceTableProps {
  basePriceInPaise: number;
  moq: number;
  tierPrices: TierPriceRow[];
}

export function TierPriceTable({ basePriceInPaise, moq, tierPrices }: TierPriceTableProps) {
  if (tierPrices.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-md border border-gray-200 text-sm">
      <table className="w-full">
        <thead className="bg-gray-50 text-xs font-medium text-gray-500">
          <tr>
            <th className="px-3 py-2 text-left">Qty</th>
            <th className="px-3 py-2 text-right">Price / unit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          <tr>
            <td className="px-3 py-2 text-gray-700">{moq}+ units</td>
            <td className="px-3 py-2 text-right font-semibold text-gray-900">
              {formatPaise(basePriceInPaise)}
            </td>
          </tr>
          {tierPrices.map((t, i) => (
            <tr key={i} className="bg-blue-50/40">
              <td className="px-3 py-2 text-gray-700">{t.minQty}+ units</td>
              <td className="px-3 py-2 text-right font-semibold text-blue-700">
                {formatPaise(t.priceInPaise)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
