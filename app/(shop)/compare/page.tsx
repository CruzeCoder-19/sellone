import { auth } from "@/auth";
import { getCompareList } from "@/server/queries/cart.queries";
import { CompareView } from "./CompareView";
import { GuestCompareView } from "./GuestCompareView";

export const metadata = { title: "Compare Products — Wolsell" };

export default async function ComparePage() {
  const session = await auth();
  if (session?.user?.id) {
    const compareList = await getCompareList(session.user.id);
    return <CompareView initialData={compareList} />;
  }
  return <GuestCompareView />;
}
