"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { applyToSell } from "@/server/actions/seller.actions";

// ─────────────────────────────────────────────────────────────────────────────
// Schema (mirrors server-side validation)
// ─────────────────────────────────────────────────────────────────────────────

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const schema = z.object({
  shopName: z.string().min(2, "Shop name must be at least 2 characters").max(100),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug must be at most 50 characters")
    .regex(SLUG_REGEX, "Only lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen."),
  businessAddress: z.string().min(10, "Please enter a full business address").max(500),
  phone: z.string().min(7, "Invalid phone number").max(20),
  email: z.string().email("Invalid email address"),
  gstin: z.string().regex(GSTIN_REGEX, "Invalid GSTIN format").optional().or(z.literal("")),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

// ─────────────────────────────────────────────────────────────────────────────
// Slug helper
// ─────────────────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

// ─────────────────────────────────────────────────────────────────────────────
// Form component
// ─────────────────────────────────────────────────────────────────────────────

export function SellerApplicationForm() {
  const router = useRouter();
  const [slugDirty, setSlugDirty] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      shopName: "",
      slug: "",
      businessAddress: "",
      phone: "",
      email: "",
      gstin: "",
      description: "",
    },
  });

  const shopName = watch("shopName");

  // Auto-fill slug from shop name until user manually edits it
  useEffect(() => {
    if (!slugDirty) {
      setValue("slug", toSlug(shopName ?? ""), { shouldValidate: false });
    }
  }, [shopName, slugDirty, setValue]);

  async function onSubmit(values: FormValues) {
    const result = await applyToSell({
      shopName: values.shopName,
      slug: values.slug,
      gstin: values.gstin || undefined,
      businessAddress: values.businessAddress,
      phone: values.phone,
      email: values.email,
      description: values.description || undefined,
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Application submitted! We'll review your shop shortly.");
    router.push("/seller");
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const errorClass = "mt-1 text-xs text-red-600";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Shop Name */}
      <div>
        <label className={labelClass}>
          Shop Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className={inputClass}
          placeholder="e.g. Mumbai Hardware Mart"
          {...register("shopName")}
        />
        {errors.shopName && <p className={errorClass}>{errors.shopName.message}</p>}
      </div>

      {/* Slug */}
      <div>
        <label className={labelClass}>
          Shop URL Slug <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className={inputClass}
          placeholder="e.g. mumbai-hardware-mart"
          {...register("slug")}
          onChange={(e) => {
            setSlugDirty(true);
            register("slug").onChange(e);
          }}
        />
        <p className="mt-1 text-xs text-gray-400">
          Your shop URL: wolsell.com/shop/{watch("slug") || "your-slug"}
        </p>
        {errors.slug && <p className={errorClass}>{errors.slug.message}</p>}
      </div>

      {/* Business Address */}
      <div>
        <label className={labelClass}>
          Business Address <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={3}
          className={inputClass}
          placeholder="123 Market Street, Mumbai, Maharashtra 400001"
          {...register("businessAddress")}
        />
        {errors.businessAddress && (
          <p className={errorClass}>{errors.businessAddress.message}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label className={labelClass}>
          Phone <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          className={inputClass}
          placeholder="+91 98765 43210"
          {...register("phone")}
        />
        {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
      </div>

      {/* Email */}
      <div>
        <label className={labelClass}>
          Business Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          className={inputClass}
          placeholder="contact@yourshop.com"
          {...register("email")}
        />
        {errors.email && <p className={errorClass}>{errors.email.message}</p>}
      </div>

      {/* GSTIN (optional) */}
      <div>
        <label className={labelClass}>GSTIN (optional)</label>
        <input
          type="text"
          className={inputClass}
          placeholder="29ABCDE1234F1ZV"
          {...register("gstin", {
            onChange: (e) => {
              e.target.value = e.target.value.toUpperCase();
            },
          })}
          maxLength={15}
        />
        {errors.gstin && <p className={errorClass}>{errors.gstin.message}</p>}
      </div>

      {/* Description (optional) */}
      <div>
        <label className={labelClass}>Shop Description (optional)</label>
        <textarea
          rows={3}
          className={inputClass}
          placeholder="Brief description of what you sell..."
          {...register("description")}
        />
        {errors.description && (
          <p className={errorClass}>{errors.description.message}</p>
        )}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Submitting…" : "Submit Application"}
        </button>
      </div>
    </form>
  );
}
