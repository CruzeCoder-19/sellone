import { auth } from "@/auth";
import { getWishlist } from "@/server/queries/cart.queries";
import { WishlistView } from "./WishlistView";
import { GuestWishlistView } from "./GuestWishlistView";

export const metadata = { title: "Wishlist — Wolsell" };

export default async function WishlistPage() {
  const session = await auth();
  if (session?.user?.id) {
    const wishlist = await getWishlist(session.user.id);
    return <WishlistView initialData={wishlist} />;
  }
  return <GuestWishlistView />;
}
