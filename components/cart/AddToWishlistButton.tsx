"use client";

import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToWishlist } from "@/server/actions/cart.actions";
import { addGuestWishlistItem } from "@/lib/guest-storage";

interface AddToWishlistButtonProps {
  productId: string;
  variantId: string | null;
}

export function AddToWishlistButton({ productId, variantId }: AddToWishlistButtonProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      addToWishlist({ productId, variantId: variantId ?? undefined }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["cart-counts"] });
      toast.success("Added to wishlist", {
        action: { label: "View wishlist", onClick: () => (window.location.href = "/wishlist") },
      });
    },
    onError: () => toast.error("Failed to add to wishlist"),
  });

  function handleClick() {
    if (session?.user?.id) {
      mutate();
    } else {
      addGuestWishlistItem({ productId, variantId });
      window.dispatchEvent(new Event("storage"));
      toast.success("Added to wishlist", {
        action: { label: "View wishlist", onClick: () => (window.location.href = "/wishlist") },
      });
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      variant="outline"
      size="lg"
      aria-label="Add to wishlist"
    >
      <Heart className="h-4 w-4" />
    </Button>
  );
}
