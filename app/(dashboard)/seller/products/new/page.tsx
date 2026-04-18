import { notFound } from "next/navigation";
import { requireRoles } from "@/lib/auth/helpers";
import { getShopForUser } from "@/server/queries/seller.queries";
import {
  getAllCategoriesFlat,
  getAllBrandsFlat,
} from "@/server/queries/seller-products.queries";
import { ProductForm } from "@/components/seller/ProductForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Add Product — Wolsell Seller" };

export default async function NewProductPage() {
  const user = await requireRoles("SELLER");
  const shop = await getShopForUser(user.id);
  if (!shop) notFound();

  const [categories, brands] = await Promise.all([
    getAllCategoriesFlat(),
    getAllBrandsFlat(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Add Product</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a new product listing for your shop.
        </p>
      </div>
      <ProductForm mode="create" categories={categories} brands={brands} />
    </div>
  );
}
