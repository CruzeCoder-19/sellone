"use client";

import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { toast } from "sonner";
import { getPublicAssetUrl } from "@/lib/blobs/url";
import { formatPaise } from "@/lib/format";
import { getCompareAction, removeCompareItem, clearCompare } from "@/server/actions/cart.actions";
import type { CompareView as CompareViewType } from "@/types/cart";

interface CompareViewProps {
  initialData: CompareViewType | null;
}

const ROW_LABELS = ["Image", "Name", "Brand", "Price", "MOQ", "Status", "Categories"];

export function CompareView({ initialData }: CompareViewProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  const { data: compare } = useQuery({
    queryKey: ["compare", userId],
    queryFn: async () => {
      const r = await getCompareAction();
      return r.ok ? r.data : null;
    },
    initialData,
    enabled: !!userId,
    staleTime: 30_000,
  });

  const { mutate: remove } = useMutation({
    mutationFn: (itemId: string) => removeCompareItem({ itemId }),
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return; }
      queryClient.invalidateQueries({ queryKey: ["compare", userId] });
      queryClient.invalidateQueries({ queryKey: ["cart-counts"] });
    },
  });

  const { mutate: clear } = useMutation({
    mutationFn: clearCompare,
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return; }
      queryClient.invalidateQueries({ queryKey: ["compare", userId] });
      queryClient.invalidateQueries({ queryKey: ["cart-counts"] });
    },
  });

  if (!compare || compare.items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Nothing to compare yet</h1>
        <p className="mb-8 text-gray-500">
          Add products to compare them side by side.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Browse products
        </Link>
      </div>
    );
  }

  const items = compare.items;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Compare <span className="text-gray-400">({items.length})</span>
        </h1>
        <button
          type="button"
          onClick={() => clear()}
          className="text-sm text-gray-500 hover:text-red-600 underline"
        >
          Clear all
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-32 border-b border-gray-200 pb-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500" />
              {items.map((item) => (
                <th key={item.id} className="border-b border-gray-200 pb-3 px-3 text-left align-bottom">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/product/${item.productSlug}`}
                      className="line-clamp-2 font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {item.productName}
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-red-500"
                      aria-label={`Remove ${item.productName} from compare`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Image row */}
            <tr>
              <td className="py-3 pr-3 text-xs font-medium text-gray-500">Image</td>
              {items.map((item) => {
                const src = item.primaryImage
                  ? getPublicAssetUrl(item.primaryImage)
                  : "/placeholder.svg";
                return (
                  <td key={item.id} className="px-3 py-3">
                    <div className="relative h-24 w-24 overflow-hidden rounded-md bg-gray-100">
                      <Image src={src} alt={item.productName} fill sizes="96px" className="object-cover" />
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Brand */}
            <tr>
              <td className="py-3 pr-3 text-xs font-medium text-gray-500">Brand</td>
              {items.map((item) => (
                <td key={item.id} className="px-3 py-3 text-gray-700">
                  {item.brand ? (
                    <Link href={`/shop?brand=${item.brand.slug}`} className="text-blue-600 hover:underline">
                      {item.brand.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              ))}
            </tr>

            {/* Price */}
            <tr>
              <td className="py-3 pr-3 text-xs font-medium text-gray-500">Price</td>
              {items.map((item) => (
                <td key={item.id} className="px-3 py-3 font-semibold text-gray-900">
                  {formatPaise(item.basePriceInPaise)}
                </td>
              ))}
            </tr>

            {/* MOQ */}
            <tr>
              <td className="py-3 pr-3 text-xs font-medium text-gray-500">MOQ</td>
              {items.map((item) => (
                <td key={item.id} className="px-3 py-3 text-gray-700">
                  {item.moq} units
                </td>
              ))}
            </tr>

            {/* Status */}
            <tr>
              <td className="py-3 pr-3 text-xs font-medium text-gray-500">Status</td>
              {items.map((item) => (
                <td key={item.id} className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.productStatus === "ACTIVE"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {item.productStatus === "ACTIVE" ? "In stock" : "Unavailable"}
                  </span>
                </td>
              ))}
            </tr>

            {/* Categories */}
            <tr>
              <td className="py-3 pr-3 text-xs font-medium text-gray-500">Categories</td>
              {items.map((item) => (
                <td key={item.id} className="px-3 py-3 text-gray-700">
                  {item.categories.length > 0
                    ? item.categories.map((c) => c.name).join(", ")
                    : "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
