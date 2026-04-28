"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createEmployeeProfile } from "@/server/actions/employee.actions";

export function EmployeeSetupForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [department, setDepartment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Employee code is required");
      return;
    }
    setSubmitting(true);
    const result = await createEmployeeProfile({
      employeeCode: code,
      department: department || undefined,
    });
    setSubmitting(false);

    if (result.ok) {
      toast.success("Profile created");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Employee Code <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className={inputCls}
          placeholder="e.g. EMP-001"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Department
        </label>
        <input
          type="text"
          className={inputCls}
          placeholder="e.g. Operations"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Setting up…" : "Set Up Profile"}
      </button>
    </form>
  );
}
