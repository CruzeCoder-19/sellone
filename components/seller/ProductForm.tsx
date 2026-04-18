"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  createProduct,
  updateProduct,
  addProductVariant,
  deleteProductVariant,
  addPriceTier,
  removePriceTier,
  addProductImages,
  removeProductImage,
} from "@/server/actions/seller-products.actions";
import type { SellerProductRow } from "@/server/queries/seller-products.queries";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; parentId: string | null };
type Brand = { id: string; name: string };

type VariantDraft = {
  localId: string;
  id?: string;           // real DB id (undefined for new variants)
  name: string;
  sku: string;
  priceDeltaInPaise: number;
  stockQty: number;
  markedForDelete: boolean;
};

type TierDraft = {
  localId: string;
  id?: string;           // real DB id (undefined for new tiers)
  minQty: number;
  priceInPaise: number;
  markedForDelete: boolean;
};

type Props = {
  mode: "create" | "edit";
  product?: SellerProductRow;
  categories: Category[];
  brands: Brand[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

const basicSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  sku: z.string().min(1, "SKU is required").max(100),
  slug: z.string().regex(SLUG_REGEX, "Only lowercase letters, numbers, and hyphens").max(100),
  description: z.string().max(2000).optional(),
  basePrice: z.string().min(1, "Price is required"),    // ₹ string → convert to paise
  moq: z.number().int().min(1, "MOQ must be at least 1"),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "SOLD_OUT", "ARCHIVED"]),
});

type BasicForm = z.infer<typeof basicSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function rupeesToPaise(rupees: string): number {
  return Math.round(parseFloat(rupees || "0") * 100);
}

function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

let localCounter = 0;
function nextLocalId() {
  return `local-${++localCounter}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ProductForm({ mode, product, categories, brands }: Props) {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [slugDirty, setSlugDirty] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // ── Variants state ──────────────────────────────────────────────────────────
  const [variants, setVariants] = useState<VariantDraft[]>(() =>
    (product?.variants ?? []).map((v) => ({
      localId: nextLocalId(),
      id: v.id,
      name: v.name,
      sku: v.sku,
      priceDeltaInPaise: v.priceDeltaInPaise,
      stockQty: v.stock,
      markedForDelete: false,
    })),
  );
  const [newVariantDraft, setNewVariantDraft] = useState({
    name: "",
    sku: "",
    priceDelta: "",
    stock: "0",
  });

  // ── Price tiers state ───────────────────────────────────────────────────────
  const [tiers, setTiers] = useState<TierDraft[]>(() =>
    (product?.tierPrices ?? []).map((t) => ({
      localId: nextLocalId(),
      id: t.id,
      minQty: t.minQty,
      priceInPaise: t.priceInPaise,
      markedForDelete: false,
    })),
  );
  const [newTierDraft, setNewTierDraft] = useState({ minQty: "", price: "" });

  // ── Images state ─────────────────────────────────────────────────────────
  // For create mode: buffer pending assetIds
  const [pendingAssetIds, setPendingAssetIds] = useState<string[]>([]);
  // For edit mode: images are refreshed via router.refresh() after immediate actions

  // ── Basic form ──────────────────────────────────────────────────────────────
  const existingCategoryId = product?.categories[0]?.category.id ?? "";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BasicForm>({
    resolver: zodResolver(basicSchema),
    defaultValues: {
      name: product?.name ?? "",
      sku: product?.sku ?? "",
      slug: product?.slug ?? "",
      description: product?.description ?? "",
      basePrice: product ? paiseToRupees(product.basePriceInPaise) : "",
      moq: product?.moq ?? 1,
      stock: product?.stock ?? 0,
      categoryId: existingCategoryId,
      brandId: product?.brandId ?? "",
      status: product?.status ?? "DRAFT",
    },
  });

  // Auto-generate slug from name until manually edited
  const watchedName = watch("name");
  useEffect(() => {
    if (!slugDirty) {
      setValue("slug", toSlug(watchedName ?? ""));
    }
  }, [watchedName, slugDirty, setValue]);

  // ── Image upload ────────────────────────────────────────────────────────────

  async function handleImageFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setImageUploading(true);
    const uploadedIds: string[] = [];

    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("store", "product-images");
      const res = await fetch("/api/blobs/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }
      uploadedIds.push(json.data.assetId);
    }

    if (uploadedIds.length > 0) {
      if (mode === "create") {
        setPendingAssetIds((prev) => [...prev, ...uploadedIds]);
        toast.success(`${uploadedIds.length} image(s) ready to save`);
      } else if (product) {
        const result = await addProductImages({ productId: product.id, assetIds: uploadedIds });
        if (result.ok) {
          toast.success("Image(s) added");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }
    }

    setImageUploading(false);
    // Reset the input so the same file can be re-selected
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  async function handleRemoveImage(imageId: string) {
    if (mode === "edit") {
      const result = await removeProductImage(imageId);
      if (result.ok) {
        toast.success("Image removed");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    }
  }

  // ── Variant helpers ─────────────────────────────────────────────────────────

  function addVariantRow() {
    const { name, sku, priceDelta, stock } = newVariantDraft;
    if (!name.trim() || !sku.trim()) {
      toast.error("Variant name and SKU are required");
      return;
    }
    setVariants((prev) => [
      ...prev,
      {
        localId: nextLocalId(),
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        priceDeltaInPaise: rupeesToPaise(priceDelta || "0"),
        stockQty: parseInt(stock || "0", 10),
        markedForDelete: false,
      },
    ]);
    setNewVariantDraft({ name: "", sku: "", priceDelta: "", stock: "0" });
  }

  function markVariantForDelete(localId: string) {
    setVariants((prev) =>
      prev.map((v) => (v.localId === localId ? { ...v, markedForDelete: true } : v)),
    );
  }

  // ── Tier helpers ────────────────────────────────────────────────────────────

  function addTierRow() {
    const { minQty, price } = newTierDraft;
    if (!minQty || !price) {
      toast.error("Min qty and price are required for a tier");
      return;
    }
    setTiers((prev) => [
      ...prev,
      {
        localId: nextLocalId(),
        minQty: parseInt(minQty, 10),
        priceInPaise: rupeesToPaise(price),
        markedForDelete: false,
      },
    ]);
    setNewTierDraft({ minQty: "", price: "" });
  }

  function markTierForDelete(localId: string) {
    setTiers((prev) =>
      prev.map((t) => (t.localId === localId ? { ...t, markedForDelete: true } : t)),
    );
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function onSubmit(values: BasicForm) {
    setSaving(true);
    try {
      const basePriceInPaise = rupeesToPaise(values.basePrice);
      const categoryIds = values.categoryId ? [values.categoryId] : [];

      if (mode === "create") {
        // 1. Create product
        const createResult = await createProduct({
          name: values.name,
          sku: values.sku,
          slug: values.slug,
          description: values.description || undefined,
          basePriceInPaise,
          moq: values.moq,
          stock: values.stock,
          categoryIds: categoryIds.length ? categoryIds : undefined,
          brandId: values.brandId || undefined,
          status: values.status,
        });

        if (!createResult.ok) {
          toast.error(createResult.error);
          return;
        }

        const { productId } = createResult.data;

        // 2. Add variants sequentially
        for (const v of variants.filter((v) => !v.markedForDelete)) {
          const r = await addProductVariant({
            productId,
            name: v.name,
            sku: v.sku,
            priceDeltaInPaise: v.priceDeltaInPaise,
            stockQty: v.stockQty,
          });
          if (!r.ok) toast.error(`Variant "${v.name}": ${r.error}`);
        }

        // 3. Add price tiers sequentially (variantId→productId per actual schema)
        for (const t of tiers.filter((t) => !t.markedForDelete)) {
          const r = await addPriceTier({
            productId,
            minQty: t.minQty,
            priceInPaise: t.priceInPaise,
          });
          if (!r.ok) toast.error(`Tier (qty≥${t.minQty}): ${r.error}`);
        }

        // 4. Add buffered images
        if (pendingAssetIds.length > 0) {
          const r = await addProductImages({ productId, assetIds: pendingAssetIds });
          if (!r.ok) toast.error(`Images: ${r.error}`);
        }

        toast.success("Product created");
        router.push("/seller/products");
      } else {
        // Edit mode
        if (!product) return;

        // 1. Update basic fields
        const updateResult = await updateProduct({
          productId: product.id,
          name: values.name,
          sku: values.sku,
          slug: values.slug,
          description: values.description || undefined,
          basePriceInPaise,
          moq: values.moq,
          stock: values.stock,
          categoryIds: categoryIds,
          brandId: values.brandId || null,
          status: values.status,
        });

        if (!updateResult.ok) {
          toast.error(updateResult.error);
          return;
        }

        // 2. Handle variant additions / deletions
        for (const v of variants) {
          if (v.markedForDelete && v.id) {
            const r = await deleteProductVariant(v.id);
            if (!r.ok) toast.error(`Delete variant "${v.name}": ${r.error}`);
          } else if (!v.id) {
            // New variant
            const r = await addProductVariant({
              productId: product.id,
              name: v.name,
              sku: v.sku,
              priceDeltaInPaise: v.priceDeltaInPaise,
              stockQty: v.stockQty,
            });
            if (!r.ok) toast.error(`Variant "${v.name}": ${r.error}`);
          }
        }

        // 3. Handle tier additions / deletions
        for (const t of tiers) {
          if (t.markedForDelete && t.id) {
            const r = await removePriceTier(t.id);
            if (!r.ok) toast.error(`Remove tier: ${r.error}`);
          } else if (!t.id) {
            const r = await addPriceTier({
              productId: product.id,
              minQty: t.minQty,
              priceInPaise: t.priceInPaise,
            });
            if (!r.ok) toast.error(`Tier (qty≥${t.minQty}): ${r.error}`);
          }
        }

        toast.success("Product updated");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const inputCls =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";
  const errCls = "mt-1 text-xs text-red-600";
  const sectionCls = "rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* ── Section 1: Basic Info ────────────────────────────────────────── */}
      <div className={sectionCls}>
        <h2 className="text-base font-semibold">Basic Info</h2>

        <div>
          <label className={labelCls}>
            Product Name <span className="text-red-500">*</span>
          </label>
          <input type="text" className={inputCls} {...register("name")} />
          {errors.name && <p className={errCls}>{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>
              SKU <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={inputCls}
              {...register("sku")}
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
                register("sku").onChange(e);
              }}
            />
            {errors.sku && <p className={errCls}>{errors.sku.message}</p>}
          </div>
          <div>
            <label className={labelCls}>
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={inputCls}
              {...register("slug")}
              onChange={(e) => {
                setSlugDirty(true);
                register("slug").onChange(e);
              }}
            />
            {errors.slug && <p className={errCls}>{errors.slug.message}</p>}
          </div>
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea rows={3} className={inputCls} {...register("description")} />
          {errors.description && <p className={errCls}>{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>
              Base Price (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={inputCls}
              {...register("basePrice")}
            />
            {errors.basePrice && <p className={errCls}>{errors.basePrice.message}</p>}
          </div>
          <div>
            <label className={labelCls}>MOQ</label>
            <input type="number" min="1" className={inputCls} {...register("moq", { valueAsNumber: true })} />
            {errors.moq && <p className={errCls}>{errors.moq.message}</p>}
          </div>
          <div>
            <label className={labelCls}>Stock</label>
            <input type="number" min="0" className={inputCls} {...register("stock", { valueAsNumber: true })} />
            {errors.stock && <p className={errCls}>{errors.stock.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Category</label>
            <select className={inputCls} {...register("categoryId")}>
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentId ? "  └ " : ""}{c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Brand</label>
            <select className={inputCls} {...register("brandId")}>
              <option value="">— None —</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>
              Status <span className="text-red-500">*</span>
            </label>
            <select className={inputCls} {...register("status")}>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="SOLD_OUT">Sold Out</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Section 2: Variants ──────────────────────────────────────────── */}
      <div className={sectionCls}>
        <h2 className="text-base font-semibold">Variants</h2>
        <p className="text-xs text-gray-500">
          Optional. Add size, colour, or other variants. Price delta is added to the base price.
        </p>

        {variants.filter((v) => !v.markedForDelete).length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="py-1 text-left">Name</th>
                <th className="py-1 text-left">SKU</th>
                <th className="py-1 text-right">Price Delta (₹)</th>
                <th className="py-1 text-right">Stock</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {variants
                .filter((v) => !v.markedForDelete)
                .map((v) => (
                  <tr key={v.localId}>
                    <td className="py-1.5">{v.name}</td>
                    <td className="py-1.5 font-mono text-xs">{v.sku}</td>
                    <td className="py-1.5 text-right">
                      {v.priceDeltaInPaise >= 0 ? "+" : ""}
                      {paiseToRupees(v.priceDeltaInPaise)}
                    </td>
                    <td className="py-1.5 text-right">{v.stockQty}</td>
                    <td className="py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => markVariantForDelete(v.localId)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {/* Add variant row */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <input
            type="text"
            placeholder="Name (e.g. Size L)"
            className={inputCls}
            value={newVariantDraft.name}
            onChange={(e) => setNewVariantDraft((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            type="text"
            placeholder="SKU"
            className={inputCls}
            value={newVariantDraft.sku}
            onChange={(e) =>
              setNewVariantDraft((p) => ({ ...p, sku: e.target.value.toUpperCase() }))
            }
          />
          <input
            type="number"
            step="0.01"
            placeholder="Price delta (₹)"
            className={inputCls}
            value={newVariantDraft.priceDelta}
            onChange={(e) => setNewVariantDraft((p) => ({ ...p, priceDelta: e.target.value }))}
          />
          <input
            type="number"
            min="0"
            placeholder="Stock"
            className={inputCls}
            value={newVariantDraft.stock}
            onChange={(e) => setNewVariantDraft((p) => ({ ...p, stock: e.target.value }))}
          />
          <button
            type="button"
            onClick={addVariantRow}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            + Add
          </button>
        </div>
      </div>

      {/* ── Section 3: Price Tiers ───────────────────────────────────────── */}
      <div className={sectionCls}>
        <h2 className="text-base font-semibold">Price Tiers</h2>
        <p className="text-xs text-gray-500">
          Bulk discounts based on minimum order quantity.
        </p>

        {tiers.filter((t) => !t.markedForDelete).length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="py-1 text-left">Min Qty</th>
                <th className="py-1 text-right">Price / unit (₹)</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tiers
                .filter((t) => !t.markedForDelete)
                .map((t) => (
                  <tr key={t.localId}>
                    <td className="py-1.5">≥ {t.minQty}</td>
                    <td className="py-1.5 text-right">{paiseToRupees(t.priceInPaise)}</td>
                    <td className="py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => markTierForDelete(t.localId)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <input
            type="number"
            min="1"
            placeholder="Min qty"
            className={inputCls}
            value={newTierDraft.minQty}
            onChange={(e) => setNewTierDraft((p) => ({ ...p, minQty: e.target.value }))}
          />
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Price / unit (₹)"
            className={inputCls}
            value={newTierDraft.price}
            onChange={(e) => setNewTierDraft((p) => ({ ...p, price: e.target.value }))}
          />
          <button
            type="button"
            onClick={addTierRow}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            + Add Tier
          </button>
        </div>
      </div>

      {/* ── Section 4: Images ────────────────────────────────────────────── */}
      <div className={sectionCls}>
        <h2 className="text-base font-semibold">Images</h2>
        <p className="text-xs text-gray-500">PNG or JPG, max 5 MB per image.</p>

        {/* Existing images (edit mode) */}
        {mode === "edit" && product && product.images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {product.images.map((img) => (
              <div key={img.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/blobs/${img.asset.store}/${img.asset.key}`}
                  alt="Product"
                  className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(img.id)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs leading-none hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pending images (create mode) */}
        {mode === "create" && pendingAssetIds.length > 0 && (
          <p className="text-sm text-green-700">
            {pendingAssetIds.length} image(s) ready to attach on save.
          </p>
        )}

        <div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageFiles}
          />
          <button
            type="button"
            disabled={imageUploading}
            onClick={() => imageInputRef.current?.click()}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {imageUploading ? "Uploading…" : "Add Images"}
          </button>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <a
          href="/seller/products"
          className="text-sm text-gray-500 hover:underline"
        >
          ← Back to products
        </a>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : mode === "create" ? "Create Product" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
