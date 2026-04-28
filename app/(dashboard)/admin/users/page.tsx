import Link from "next/link";
import { requireRoles } from "@/lib/auth/helpers";
import { getUsers } from "@/server/queries/admin.queries";
import { softDeleteUser } from "@/server/actions/admin.actions";
import { EditRolesDialog } from "@/components/admin/EditRolesDialog";
import type { Metadata } from "next";
import type { Role } from "@prisma/client";

export const metadata: Metadata = { title: "Users — Wolsell Admin" };

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: "bg-red-100 text-red-700",
  EMPLOYEE: "bg-blue-100 text-blue-700",
  SELLER: "bg-purple-100 text-purple-700",
  SALES: "bg-yellow-100 text-yellow-700",
  CUSTOMER: "bg-gray-100 text-gray-600",
};

const PAGE_SIZE = 20;
const ROLES: Role[] = ["CUSTOMER", "SELLER", "EMPLOYEE", "SALES", "ADMIN"];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; role?: string }>;
}) {
  const actor = await requireRoles("ADMIN");
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() || undefined;
  const roleFilter = ROLES.find((r) => r === params.role) as Role | undefined;

  const { rows, total } = await getUsers({ page, pageSize: PAGE_SIZE, search, roleFilter });
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      {/* Filters */}
      <form method="get" className="flex flex-wrap gap-2">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search name or email…"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          name="role"
          defaultValue={roleFilter ?? ""}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
          Filter
        </button>
        <Link href="/admin/users" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
          Clear
        </Link>
      </form>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email / Phone</th>
              <th className="px-4 py-3 text-left">Roles</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{user.name ?? "—"}</p>
                  {user.deletedAt && (
                    <span className="text-xs text-red-500">Deleted</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <p>{user.email ?? "—"}</p>
                  {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.userRoles.map((ur) => (
                      <span
                        key={ur.role}
                        className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${ROLE_COLORS[ur.role]}`}
                      >
                        {ur.role}
                      </span>
                    ))}
                    {user.userRoles.length === 0 && (
                      <span className="text-xs text-gray-400">No roles</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <EditRolesDialog
                      userId={user.id}
                      currentRoles={user.userRoles.map((r) => r.role)}
                      currentUserId={actor.id}
                    />
                    {user.id !== actor.id && !user.deletedAt && (
                      <form
                        action={async () => {
                          "use server";
                          await softDeleteUser(user.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            if (!confirm(`Delete user "${user.name ?? user.email}"?`)) {
                              e.preventDefault();
                            }
                          }}
                        >
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/admin/users?page=${page - 1}${search ? `&search=${search}` : ""}${roleFilter ? `&role=${roleFilter}` : ""}`}
              className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/admin/users?page=${page + 1}${search ? `&search=${search}` : ""}${roleFilter ? `&role=${roleFilter}` : ""}`}
              className="rounded border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
