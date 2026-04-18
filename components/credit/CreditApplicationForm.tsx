"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { submitCreditApplication } from "@/server/actions/credit.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─────────────────────────────────────────────────────────────────────────────
// Form schema (client-side — always submitting, so draft: false)
// ─────────────────────────────────────────────────────────────────────────────

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const formSchema = z
  .object({
    legalName: z.string().min(1, "Legal name is required"),
    panNumber: z.string().min(1, "PAN number is required"),
    gstin: z.string().optional(),
    businessAddress: z.string().min(1, "Business address is required"),
    monthlyTurnover: z.string().optional(), // stored as string, converted to paise on submit
  })
  .superRefine((val, ctx) => {
    if (!PAN_RE.test(val.panNumber)) {
      ctx.addIssue({
        code: "custom",
        path: ["panNumber"],
        message: "Invalid PAN format (expected: AAAAA0000A)",
      });
    }
    if (val.gstin && !GSTIN_RE.test(val.gstin)) {
      ctx.addIssue({
        code: "custom",
        path: ["gstin"],
        message: "Invalid GSTIN format",
      });
    }
    if (val.monthlyTurnover) {
      const n = parseFloat(val.monthlyTurnover);
      if (isNaN(n) || n < 0) {
        ctx.addIssue({
          code: "custom",
          path: ["monthlyTurnover"],
          message: "Enter a valid monthly turnover",
        });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// KYC file upload state
// ─────────────────────────────────────────────────────────────────────────────

interface UploadedFile {
  assetId: string;
  filename: string;
}

interface PendingFile {
  filename: string;
  uploading: boolean;
  error: string | null;
}

export function CreditApplicationForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ─── File upload handler ─────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = ""; // reset input so same file can be re-selected after removal

    const remaining = 3 - uploadedFiles.length - pendingFiles.filter((p) => p.uploading).length;
    const toUpload = selected.slice(0, remaining);

    if (toUpload.length === 0) return;

    // Add pending entries immediately
    setPendingFiles((prev) => [
      ...prev,
      ...toUpload.map((f) => ({ filename: f.name, uploading: true, error: null })),
    ]);

    for (const file of toUpload) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("store", "kyc-docs");

      try {
        const res = await fetch("/api/blobs/upload", { method: "POST", body: fd });
        const json = await res.json();

        if (!json.ok) {
          setPendingFiles((prev) =>
            prev.map((p) =>
              p.filename === file.name && p.uploading
                ? { ...p, uploading: false, error: json.error ?? "Upload failed" }
                : p,
            ),
          );
        } else {
          setUploadedFiles((prev) => [...prev, { assetId: json.data.assetId, filename: file.name }]);
          setPendingFiles((prev) => prev.filter((p) => !(p.filename === file.name && p.uploading)));
        }
      } catch {
        setPendingFiles((prev) =>
          prev.map((p) =>
            p.filename === file.name && p.uploading
              ? { ...p, uploading: false, error: "Network error — please try again" }
              : p,
          ),
        );
      }
    }
  }

  function removeUploadedFile(assetId: string) {
    setUploadedFiles((prev) => prev.filter((f) => f.assetId !== assetId));
  }

  function dismissPendingError(filename: string) {
    setPendingFiles((prev) => prev.filter((p) => p.filename !== filename));
  }

  // ─── Form submit ─────────────────────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    const monthlyTurnoverInPaise = values.monthlyTurnover
      ? Math.round(parseFloat(values.monthlyTurnover) * 100)
      : undefined;

    const result = await submitCreditApplication({
      legalName: values.legalName,
      panNumber: values.panNumber,
      gstin: values.gstin || undefined,
      businessAddress: values.businessAddress,
      monthlyTurnoverInPaise,
      kycDocAssetIds: uploadedFiles.map((f) => f.assetId),
      draft: false,
    });

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    toast.success("Application submitted!");
    router.push("/customer/credit");
  }

  const totalFiles = uploadedFiles.length + pendingFiles.filter((p) => p.uploading).length;
  const canAddMore = totalFiles < 3;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {submitError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      {/* Legal Name */}
      <div className="space-y-1.5">
        <Label htmlFor="legalName">Legal Business Name</Label>
        <Input
          id="legalName"
          type="text"
          placeholder="As registered with authorities"
          aria-invalid={!!errors.legalName}
          {...register("legalName")}
        />
        {errors.legalName && (
          <p className="text-xs text-destructive">{errors.legalName.message}</p>
        )}
      </div>

      {/* PAN Number */}
      <div className="space-y-1.5">
        <Label htmlFor="panNumber">PAN Number</Label>
        <Input
          id="panNumber"
          type="text"
          placeholder="AAAAA0000A"
          maxLength={10}
          aria-invalid={!!errors.panNumber}
          {...register("panNumber", {
            onChange: (e) => {
              e.target.value = e.target.value.toUpperCase();
              setValue("panNumber", e.target.value, { shouldValidate: true });
            },
          })}
        />
        {errors.panNumber && (
          <p className="text-xs text-destructive">{errors.panNumber.message}</p>
        )}
      </div>

      {/* GSTIN (optional) */}
      <div className="space-y-1.5">
        <Label htmlFor="gstin">
          GSTIN{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="gstin"
          type="text"
          placeholder="22AAAAA0000A1Z5"
          maxLength={15}
          aria-invalid={!!errors.gstin}
          {...register("gstin", {
            onChange: (e) => {
              e.target.value = e.target.value.toUpperCase();
              setValue("gstin", e.target.value, { shouldValidate: true });
            },
          })}
        />
        {errors.gstin && (
          <p className="text-xs text-destructive">{errors.gstin.message}</p>
        )}
      </div>

      {/* Business Address */}
      <div className="space-y-1.5">
        <Label htmlFor="businessAddress">Business Address</Label>
        <textarea
          id="businessAddress"
          rows={3}
          placeholder="Full registered business address"
          aria-invalid={!!errors.businessAddress}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
          {...register("businessAddress")}
        />
        {errors.businessAddress && (
          <p className="text-xs text-destructive">{errors.businessAddress.message}</p>
        )}
      </div>

      {/* Monthly Turnover */}
      <div className="space-y-1.5">
        <Label htmlFor="monthlyTurnover">
          Monthly Turnover (₹){" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
            ₹
          </span>
          <Input
            id="monthlyTurnover"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            className="pl-6"
            aria-invalid={!!errors.monthlyTurnover}
            {...register("monthlyTurnover")}
          />
        </div>
        {errors.monthlyTurnover && (
          <p className="text-xs text-destructive">{errors.monthlyTurnover.message}</p>
        )}
      </div>

      {/* KYC Documents */}
      <div className="space-y-2">
        <Label>
          KYC Documents{" "}
          <span className="font-normal text-muted-foreground">
            (PDF, JPG, or PNG — max 5 MB each, up to 3 files)
          </span>
        </Label>

        {/* Uploaded files */}
        {uploadedFiles.map((f) => (
          <div
            key={f.assetId}
            className="flex items-center justify-between rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm"
          >
            <span className="truncate">{f.filename}</span>
            <button
              type="button"
              onClick={() => removeUploadedFile(f.assetId)}
              className="ml-2 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label={`Remove ${f.filename}`}
            >
              ✕
            </button>
          </div>
        ))}

        {/* Pending / errored uploads */}
        {pendingFiles.map((p, i) => (
          <div
            key={`${p.filename}-${i}`}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
              p.error
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-input bg-muted/30 text-muted-foreground"
            }`}
          >
            <span className="truncate">
              {p.uploading ? `Uploading ${p.filename}…` : p.error ? `${p.filename}: ${p.error}` : p.filename}
            </span>
            {p.error && (
              <button
                type="button"
                onClick={() => dismissPendingError(p.filename)}
                className="ml-2 shrink-0 hover:text-destructive"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {/* File input — only show when under limit */}
        {canAddMore && (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-input bg-muted/20 py-6 text-sm text-muted-foreground transition-colors hover:bg-muted/40">
            <span className="mb-1 text-base">+</span>
            <span>Click to upload document</span>
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              onChange={handleFileChange}
            />
          </label>
        )}

        {!canAddMore && uploadedFiles.length >= 3 && (
          <p className="text-xs text-muted-foreground">Maximum 3 documents uploaded.</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
        {isSubmitting ? "Submitting…" : "Submit Application"}
      </Button>
    </form>
  );
}
