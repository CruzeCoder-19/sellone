import { auth } from "@/auth";
import { getCart } from "@/server/queries/cart.queries";
import { CartView } from "./CartView";
import { GuestCartView } from "./GuestCartView";

export const metadata = { title: "Cart — Wolsell" };

export default async function CartPage() {
  const session = await auth();
  if (session?.user?.id) {
    const cart = await getCart(session.user.id);
    return <CartView initialData={cart} />;
  }
  return <GuestCartView />;
}
