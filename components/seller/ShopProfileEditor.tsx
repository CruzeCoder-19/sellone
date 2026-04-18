"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { updateShopProfile } from "@/server/actions/seller.actions";
import type { ShopWithAssets } from "@/server/queries/seller.queries";

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const schema = z.object({
  name: z.string().min(2, "Shop name must be at least 2 characters").max(100),
  description: z.string().max(500).optional(),
  gstin: z.string().regex(GSTIN_REGEX, "Invalid GSTIN format").optional().or(z.literal("")),
  businessAddress: z.string().min(10, "Please enter a full business address").max(500),
  phone: z.string().min(7, "Invalid phone number").max(20),
  email: z.string().email("Invalid email address"),
});

type FormValues = z.infer<typeof schema>;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ShopProfileEditor({ shop }: { shop: ShopWithAssets }) {
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: shop.name,
      description: shop.description ?? "",
      gstin: shop.gstin ?? "",
      businessAddress: shop.businessAddress,
      phone: shop.phone,
      email: shop.email,
    },
  });

  // ── Asset upload helper ───────────────────────────────────────────────────

  async function uploadAsset(file: File, field: "logoAssetId" | "bannerAssetId") {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("store", "shop-assets");

    const res = await fetch("/api/blobs/upload", { method: "POST", body: fd });
    const json = await res.json();

    if (!json.ok) {
      toast.error("Upload failed. Please try again.");
      return;
    }

    const result = await updateShopProfile({ [field]: json.data.assetId });
    if (result.ok) {
      toast.success(field === "logoAssetId" ? "Logo updated" : "Banner updated");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    await uploadAsset(file, "logoAssetId");
    setLogoUploading(false);
  }

  async function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    await uploadAsset(file, "bannerAssetId");
    setBannerUploading(false);
  }

  // ── Form submit ───────────────────────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    const result = await updateShopProfile({
      name: values.name,
      description: values.description || undefined,
      gstin: values.gstin || undefined,
      businessAddress: values.businessAddress,
      phone: values.phone,
      email: values.email,
    });

    if (result.ok) {
      toast.success("Profile saved");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const errorClass = "mt-1 text-xs text-red-600";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  const logoUrl = shop.logoAsset
    ? `/api/blobs/${shop.logoAsset.store}/${shop.logoAsset.key}`
    : null;
  const bannerUrl = shop.bannerAsset
    ? `/api/blobs/${shop.bannerAsset.store}/${shop.bannerAsset.key}`
    : null;

  return (
    <div className="space-y-8">
      {/* ── Logo & Banner ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Shop Images</h2>
        <div className="flex flex-col gap-6 sm:flex-row">
          {/* Logo */}
          <div>
            <p className={labelClass}>Shop Logo</p>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Shop logo" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-gray-300">
                    {shop.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <button
                  type="button"
                  disabled={logoUploading}
                  onClick={() => logoInputRef.current?.click()}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  {logoUploading ? "Uploading…" : "Change Logo"}
                </button>
                <p className="mt-1 text-xs text-gray-400">PNG or JPG, max 5 MB</p>
              </div>
            </div>
          </div>

          {/* Banner */}
          <div className="flex-1">
            <p className={labelClass}>Shop Banner</p>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              {bannerUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bannerUrl}
                  alt="Shop banner"
                  className="h-24 w-full object-cover"
                />
              ) : (
                <div className="flex h-24 items-center justify-center text-sm text-gray-400">
                  No banner uploaded
                </div>
              )}
            </div>
            <div className="mt-2">
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerChange}
              />
              <button
                type="button"
                disabled={bannerUploading}
                onClick={() => bannerInputRef.current?.click()}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {bannerUploading ? "Uploading…" : "Change Banner"}
              </button>
              <span className="ml-2 text-xs text-gray-400">PNG or JPG, max 5 MB</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Profile form ──────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h2 className="mb-4 text-base font-semibold">Shop Details</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>
              Shop Name <span className="text-red-500">*</span>
            </label>
            <input type="text" className={inputClass} {...register("name")} />
            {errors.name && <p className={errorClass}>{errors.name.message}</p>}
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea rows={3} className={inputClass} {...register("description")} />
            {errors.description && (
              <p className={errorClass}>{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Phone <span className="text-red-500">*</span>
              </label>
              <input type="tel" className={inputClass} {...register("phone")} />
              {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
            </div>
            <div>
              <label className={labelClass}>
                Email <span className="text-red-500">*</span>
              </label>
              <input type="email" className={inputClass} {...register("email")} />
              {errors.email && <p className={errorClass}>{errors.email.message}</p>}
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Business Address <span className="text-red-500">*</span>
            </label>
            <textarea rows={2} className={inputClass} {...register("businessAddress")} />
            {errors.businessAddress && (
              <p className={errorClass}>{errors.businessAddress.message}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>GSTIN (optional)</label>
            <input
              type="text"
              className={inputClass}
              maxLength={15}
              {...register("gstin", {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase();
                },
              })}
            />
            {errors.gstin && <p className={errorClass}>{errors.gstin.message}</p>}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
