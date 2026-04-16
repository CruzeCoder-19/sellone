/**
 * Generates a human-readable order number in the format WOL-YYYY-NNNNNN.
 * NNNNNN is a zero-padded random 6-digit number — NOT sequential.
 * Collisions are caught at the DB layer via @unique on orderNumber.
 * The caller (placeOrder) retries up to 3 times with a fresh number on collision.
 */
export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const n = Math.floor(Math.random() * 1_000_000);
  const padded = n.toString().padStart(6, "0");
  return `WOL-${year}-${padded}`;
}
