"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateUserRoles } from "@/server/actions/admin.actions";
import type { Role } from "@prisma/client";

const ALL_ROLES: Role[] = ["CUSTOMER", "SELLER", "EMPLOYEE", "SALES", "ADMIN"];

type Props = {
  userId: string;
  currentRoles: Role[];
  currentUserId: string; // logged-in admin's own ID
};

export function EditRolesDialog({ userId, currentRoles, currentUserId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<Role>>(new Set(currentRoles));
  const [saving, setSaving] = useState(false);

  const isSelf = userId === currentUserId;

  function toggle(role: Role) {
    if (isSelf && role === "ADMIN") return; // cannot remove own ADMIN
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(role) ? next.delete(role) : next.add(role);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    const result = await updateUserRoles({ userId, roles: Array.from(selected) });
    setSaving(false);
    if (result.ok) {
      toast.success("Roles updated");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <button
        onClick={() => { setSelected(new Set(currentRoles)); setOpen(true); }}
        className="rounded border border-gray-200 px-2.5 py-1 text-xs hover:bg-gray-50"
      >
        Edit Roles
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-80 rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold">Edit Roles</h2>
            <div className="space-y-2">
              {ALL_ROLES.map((role) => {
                const disabled = isSelf && role === "ADMIN";
                return (
                  <label
                    key={role}
                    className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer ${
                      disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(role)}
                      onChange={() => toggle(role)}
                      disabled={disabled}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm font-medium">{role}</span>
                    {disabled && (
                      <span className="ml-auto text-xs text-gray-400">Cannot remove own</span>
                    )}
                  </label>
                );
              })}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
