import { notFound } from "next/navigation";
import { requireRoles } from "@/lib/auth/helpers";
import { getShopForUser } from "@/server/queries/seller.queries";
import {
  getSellerProduct,
  getAllCategoriesFlat,
  getAllBrandsFlat,
} from "@/server/queries/seller-products.queries";
import { ProductForm } from "@/components/seller/ProductForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Product — Wolsell Seller" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const user = await requireRoles("SELLER");
  const shop = await getShopForUser(user.id);
  if (!shop) notFound();

  const { productId } = await params;

  const [product, categories, brands] = await Promise.all([
    getSellerProduct(shop.id, productId),
    getAllCategoriesFlat(),
    getAllBrandsFlat(),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Edit Product</h1>
        <p className="mt-1 text-sm text-gray-500">{product.name}</p>
      </div>
      <ProductForm
        mode="edit"
        product={product}
        categories={categories}
        brands={brands}
      />
    </div>
  );
}
