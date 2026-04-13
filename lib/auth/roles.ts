export type Role = "CUSTOMER" | "SELLER" | "EMPLOYEE" | "SALES" | "ADMIN";

export function hasRole(roles: string[], ...required: Role[]): boolean {
  return required.some((r) => roles.includes(r));
}

export function requireRole(roles: string[], ...required: Role[]): void {
  if (!hasRole(roles, ...required)) throw new Error("Forbidden");
}
