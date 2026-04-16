import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCheckoutSummary } from "@/server/actions/checkout.actions";
import { CheckoutFlow } from "./CheckoutFlow";

export const metadata = { title: "Checkout — Wolsell" };

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/checkout");
  }

  const result = await getCheckoutSummary();
  if (!result.ok) {
    // Cart is empty — redirect to cart
    redirect("/cart");
  }

  return <CheckoutFlow initialData={result.data} />;
}
