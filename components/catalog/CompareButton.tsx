"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GitCompareArrows } from "lucide-react";
import { addToCompare, removeCompareItem, getCompareAction } from "@/server/actions/cart.actions";
import {
  readGuestCompare,
  addGuestCompareItem,
  removeGuestCompareItem,
} from "@/lib/guest-storage";

interface CompareButtonProps {
  productId: string;
  variantId: string | null;
}

export function CompareButton({ productId, variantId }: CompareButtonProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  // ── Authenticated: fetch compare list to know if product is in it ──────────
  const { data: compareData } = useQuery({
    queryKey: ["compare", userId],
    queryFn: async () => {
      const r = await getCompareAction();
      return r.ok ? r.data : null;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const isInCompareAuth =
    !!userId &&
    !!compareData?.items.some(
      (i) => i.productId === productId && i.variantId === variantId,
    );

  // ── Guest: read from localStorage ─────────────────────────────────────────
  const [isInCompareGuest, setIsInCompareGuest] = useState(false);
  useEffect(() => {
    if (userId) return;
    function check() {
      setIsInCompareGuest(
        readGuestCompare().some(
          (i) => i.productId === productId && i.variantId === variantId,
        ),
      );
    }
    check();
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, [userId, productId, variantId]);

  const isActive = userId ? isInCompareAuth : isInCompareGuest;

  // ── Server mutations ───────────────────────────────────────────────────────
  const compareItemId = compareData?.items.find(
    (i) => i.productId === productId && i.variantId === variantId,
  )?.id;

  const { mutate: addMutate, isPending: addPending } = useMutation({
    mutationFn: () => addToCompare({ productId, variantId: variantId ?? undefined }),
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return; }
      queryClient.invalidateQueries({ queryKey: ["compare", userId] });
      queryClient.invalidateQueries({ queryKey: ["cart-counts"] });
    },
    onError: () => toast.error("Failed to add to compare"),
  });

  const { mutate: removeMutate, isPending: removePending } = useMutation({
    mutationFn: () => removeCompareItem({ itemId: compareItemId! }),
    onSuccess: (result) => {
      if (!result.ok) { toast.error(result.error); return; }
      queryClient.invalidateQueries({ queryKey: ["compare", userId] });
      queryClient.invalidateQueries({ queryKey: ["cart-counts"] });
    },
    onError: () => toast.error("Failed to remove from compare"),
  });

  function handleClick() {
    if (userId) {
      if (isActive && compareItemId) {
        removeMutate();
      } else {
        addMutate();
      }
    } else {
      if (isActive) {
        removeGuestCompareItem(productId, variantId);
      } else {
        const added = addGuestCompareItem({ productId, variantId });
        if (!added) {
          toast.error("Maximum 4 products in compare list");
        }
      }
      window.dispatchEvent(new Event("storage"));
    }
  }

  const isPending = addPending || removePending;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={isActive ? "Remove from compare" : "Add to compare"}
      className={`flex h-7 w-7 items-center justify-center rounded-full border bg-white shadow-sm transition-colors disabled:opacity-50 ${
        isActive
          ? "border-blue-600 text-blue-600"
          : "border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600"
      }`}
    >
      <GitCompareArrows className="h-3.5 w-3.5" />
    </button>
  );
}
