"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createLead, updateLead } from "@/server/actions/sales.actions";
import type { SalesLead } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const schema = z.object({
  contactName: z.string().min(1, "Contact name is required").max(200),
  contactPhone: z.string().max(30).optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"]).optional(),
  notes: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

type Props =
  | { mode: "create"; lead?: never }
  | { mode: "edit"; lead: SalesLead };

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

export function LeadForm({ mode, lead }: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contactName: lead?.contactName ?? "",
      contactPhone: lead?.contactPhone ?? "",
      contactEmail: lead?.contactEmail ?? "",
      status: lead?.status,
      notes: lead?.notes ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (mode === "create") {
      const result = await createLead({
        contactName: values.contactName,
        contactPhone: values.contactPhone || undefined,
        contactEmail: values.contactEmail || undefined,
        notes: values.notes || undefined,
      });

      if (result.ok) {
        toast.success("Lead created");
        router.push("/sales/leads");
      } else {
        toast.error(result.error);
      }
    } else {
      const result = await updateLead({
        leadId: lead.id,
        contactName: values.contactName,
        contactPhone: values.contactPhone || undefined,
        contactEmail: values.contactEmail || undefined,
        status: values.status,
        notes: values.notes || undefined,
      });

      if (result.ok) {
        toast.success("Lead updated");
        router.push("/sales/leads");
      } else {
        toast.error(result.error);
      }
    }
  }

  const inputCls =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const errCls = "mt-1 text-xs text-red-600";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
    >
      <div>
        <label className={labelCls}>
          Contact Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className={inputCls}
          placeholder="e.g. Ramesh Hardware"
          {...register("contactName")}
        />
        {errors.contactName && <p className={errCls}>{errors.contactName.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Phone</label>
          <input
            type="tel"
            className={inputCls}
            placeholder="+91 98765 43210"
            {...register("contactPhone")}
          />
          {errors.contactPhone && <p className={errCls}>{errors.contactPhone.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input
            type="email"
            className={inputCls}
            placeholder="contact@example.com"
            {...register("contactEmail")}
          />
          {errors.contactEmail && <p className={errCls}>{errors.contactEmail.message}</p>}
        </div>
      </div>

      {mode === "edit" && (
        <div>
          <label className={labelCls}>Status</label>
          <select className={inputCls} {...register("status")}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={labelCls}>Notes</label>
        <textarea
          rows={4}
          className={inputCls}
          placeholder="Any additional notes about this lead…"
          {...register("notes")}
        />
        {errors.notes && <p className={errCls}>{errors.notes.message}</p>}
      </div>

      <div className="flex items-center justify-between pt-2">
        <a href="/sales/leads" className="text-sm text-gray-500 hover:underline">
          ← Back to Leads
        </a>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Saving…"
            : mode === "create"
            ? "Create Lead"
            : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
