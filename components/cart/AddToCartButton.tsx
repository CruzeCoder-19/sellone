"use client";

import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/server/actions/cart.actions";
import { addGuestCartItem } from "@/lib/guest-storage";

interface AddToCartButtonProps {
  productId: string;
  variantId: string | null;
  quantity: number;
  disabled?: boolean;
}

export function AddToCartButton({ productId, variantId, quantity, disabled }: AddToCartButtonProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      addToCart({ productId, variantId: variantId ?? undefined, quantity }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["cart-counts"] });
      toast.success("Added to cart", {
        action: { label: "View cart", onClick: () => (window.location.href = "/cart") },
      });
    },
    onError: () => toast.error("Failed to add to cart"),
  });

  function handleClick() {
    if (session?.user?.id) {
      mutate();
    } else {
      addGuestCartItem({ productId, variantId, quantity });
      // Storage events don't fire in the same tab that wrote localStorage,
      // so dispatch manually to update HeaderIcons' useEffect listener.
      window.dispatchEvent(new Event("storage"));
      toast.success("Added to cart", {
        action: { label: "View cart", onClick: () => (window.location.href = "/cart") },
      });
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isPending}
      size="lg"
      className="flex-1 gap-2"
    >
      <ShoppingCart className="h-4 w-4" />
      {isPending ? "Adding…" : "Add to cart"}
    </Button>
  );
}
