"use server";

import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { calculateEffectivePrice } from "@/lib/format";
import { getCart } from "@/server/queries/cart.queries";
import { listAddresses } from "@/server/queries/address.queries";
import { generateOrderNumber } from "@/lib/order-number";
import { getPaymentProvider } from "@/lib/payments";
import type { CartView } from "@/types/cart";
import type { Address } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

export type CheckoutSummary = {
  cart: CartView;
  addresses: Address[];
  creditAccount: {
    status: string;
    limitInPaise: number;
    outstandingInPaise: number;
    availableInPaise: number;
  } | null;
  canPayPrepaid: true;
  canPayCredit: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper
// ─────────────────────────────────────────────────────────────────────────────

async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// getCheckoutSummary
// ─────────────────────────────────────────────────────────────────────────────

export async function getCheckoutSummary(): Promise<ActionResult<CheckoutSummary>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const [cart, addresses, creditAccount] = await Promise.all([
    getCart(userId),
    listAddresses(userId),
    prisma.creditAccount.findUnique({ where: { userId } }),
  ]);

  if (!cart || cart.items.length === 0) {
    return { ok: false, error: "Cart is empty" };
  }

  const credit = creditAccount
    ? {
        status: creditAccount.status,
        limitInPaise: creditAccount.limitInPaise,
        outstandingInPaise: creditAccount.outstandingInPaise,
        availableInPaise: creditAccount.limitInPaise - creditAccount.outstandingInPaise,
      }
    : null;

  const canPayCredit =
    !!credit &&
    credit.status === "APPROVED" &&
    credit.availableInPaise >= cart.subtotalInPaise;

  return {
    ok: true,
    data: {
      cart,
      addresses,
      creditAccount: credit,
      canPayPrepaid: true,
      canPayCredit,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// placeOrder
//
// 9-step atomicity contract (per ATOMICITY REQUIREMENTS in Prompt 4b):
//
// INSIDE a single prisma.$transaction (Serializable isolation):
//   1. Re-fetch cart items + product (status, stock, tierPrices) + variant (stock).
//      Never trust client-supplied prices or stock levels.
//   2. Per line: validate ACTIVE, deletedAt null, quantity >= moq, quantity <= stock.
//      Reject entire order if any line fails.
//   3. Compute subtotal from re-fetched data using calculateEffectivePrice.
//   4. If WOLSELL_CREDIT:
//      a. Re-fetch CreditAccount.
//      b. Verify status === "APPROVED".
//      c. Verify (limit - outstanding) >= total.
//      d. Increment outstandingInPaise by total.
//      e. Create CreditTransaction (type=CHARGE, status=CONFIRMED).
//   5. Decrement product.stock or variant.stock using Prisma `decrement` operator.
//   6. Create Order row (snapshot address). Unique constraint on orderNumber — caller
//      catches P2002 and retries with a fresh number (max 3 times).
//   7. Create OrderItem rows with productSnapshot JSON.
//   8. Delete all CartItems for the user's cart.
//   9. Return orderId + orderNumber.
//
// On any failure: entire transaction rolls back; cart is unchanged.
// Serializable prevents lost updates on credit balance and stock under concurrent
// orders. SQLite/MySQL would need different handling — Postgres handles this correctly.
// ─────────────────────────────────────────────────────────────────────────────

export async function placeOrder({
  addressId,
  paymentMethod,
}: {
  addressId: string;
  paymentMethod: "PREPAID" | "WOLSELL_CREDIT";
}): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, error: "Please sign in to place an order" };

  // Verify address ownership upfront (outside transaction — cheap check)
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) return { ok: false, error: "Address not found" };

  const MAX_RETRIES = 3;
  const BACKOFF_MS = [50, 200, 800];

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const orderNumber = generateOrderNumber();

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // ── STEP 1: Re-fetch cart from DB ──────────────────────────────────
          const cart = await tx.cart.findFirst({
            where: { userId },
            include: {
              items: {
                include: {
                  product: {
                    include: {
                      images: {
                        take: 1,
                        orderBy: { sortOrder: "asc" as const },
                        include: { asset: { select: { id: true, key: true, store: true } } },
                      },
                      tierPrices: {
                        select: { minQty: true, priceInPaise: true },
                        orderBy: { minQty: "asc" as const },
                      },
                      sellerShop: { select: { id: true } },
                    },
                  },
                  variant: { select: { id: true, stock: true } },
                },
              },
            },
          });

          if (!cart || cart.items.length === 0) {
            throw new CheckoutError("Cart is empty");
          }

          // ── STEP 2 + 3: Validate each line + compute subtotal ──────────────
          let subtotalInPaise = 0;

          for (const item of cart.items) {
            const p = item.product;
            if (p.status !== "ACTIVE" || p.deletedAt !== null) {
              throw new CheckoutError(`${p.name} is no longer available`);
            }
            if (item.quantity < p.moq) {
              throw new CheckoutError(
                `Quantity for ${p.name} is below minimum order quantity (${p.moq})`,
              );
            }
            const effectiveStock = item.variant ? item.variant.stock : p.stock;
            if (item.quantity > effectiveStock) {
              throw new CheckoutError(
                `Stock changed for ${p.name} — please review your cart`,
              );
            }
            const unitPrice = calculateEffectivePrice(
              p.basePriceInPaise,
              p.tierPrices,
              item.quantity,
            );
            subtotalInPaise += unitPrice * item.quantity;
          }

          const totalInPaise = subtotalInPaise; // No discount/shipping in this phase

          // ── STEP 4: Credit payment handling ───────────────────────────────
          let creditAccountId: string | null = null;

          if (paymentMethod === "WOLSELL_CREDIT") {
            const creditAccount = await tx.creditAccount.findUnique({ where: { userId } });
            if (!creditAccount) throw new CheckoutError("No credit account found");
            if (creditAccount.status !== "APPROVED")
              throw new CheckoutError("Credit account is not approved");
            const available = creditAccount.limitInPaise - creditAccount.outstandingInPaise;
            if (available < totalInPaise)
              throw new CheckoutError("Credit limit insufficient for this order");

            // d. Increment outstanding
            await tx.creditAccount.update({
              where: { id: creditAccount.id },
              data: { outstandingInPaise: { increment: totalInPaise } },
            });
            creditAccountId = creditAccount.id;
          }

          // ── STEP 5: Decrement stock ────────────────────────────────────────
          for (const item of cart.items) {
            if (item.variant) {
              await tx.productVariant.update({
                where: { id: item.variant.id },
                data: { stock: { decrement: item.quantity } },
              });
            } else {
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } },
              });
            }
          }

          // ── STEP 6: Create Order ───────────────────────────────────────────
          const shippingAddressSnapshot = {
            id: address.id,
            label: address.label,
            line1: address.line1,
            line2: address.line2 ?? null,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
            phone: address.phone,
          };

          const order = await tx.order.create({
            data: {
              orderNumber,
              customerId: userId,
              status: "PENDING",
              paymentMethod,
              paymentStatus: paymentMethod === "WOLSELL_CREDIT" ? "PAID" : "PENDING",
              subtotalInPaise,
              totalInPaise,
              shippingAddressSnapshot,
            },
          });

          // ── STEP 4e: Create CreditTransaction (after order.id exists) ─────
          if (paymentMethod === "WOLSELL_CREDIT" && creditAccountId) {
            await tx.creditTransaction.create({
              data: {
                creditAccountId,
                type: "CHARGE",
                amountInPaise: totalInPaise,
                status: "CONFIRMED",
                relatedOrderId: order.id,
              },
            });
          }

          // ── STEP 7: Create OrderItem rows ─────────────────────────────────
          for (const item of cart.items) {
            const p = item.product;
            const unitPrice = calculateEffectivePrice(
              p.basePriceInPaise,
              p.tierPrices,
              item.quantity,
            );
            const img = p.images[0];
            const productSnapshot = {
              name: p.name,
              sku: p.sku,
              primaryImage: img
                ? { assetId: img.asset.id, key: img.asset.key, store: img.asset.store }
                : null,
            };

            await tx.orderItem.create({
              data: {
                orderId: order.id,
                productId: item.productId,
                variantId: item.variantId ?? null,
                sellerShopId: p.sellerShop?.id ?? null,
                quantity: item.quantity,
                unitPriceInPaise: unitPrice,
                lineTotalInPaise: unitPrice * item.quantity,
                productSnapshot,
              },
            });
          }

          // ── STEP 8: Empty the cart ─────────────────────────────────────────
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

          // ── STEP 9: Return ─────────────────────────────────────────────────
          return { orderId: order.id, orderNumber: order.orderNumber };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          // Serializable prevents lost updates on credit balance and stock under
          // concurrent orders. SQLite/MySQL would need different handling —
          // Postgres handles this correctly.
        },
      );

      // PREPAID: call payment provider outside the transaction (idempotent)
      if (paymentMethod === "PREPAID") {
        const provider = getPaymentProvider();
        await provider.createIntent({
          amountInPaise: (
            await prisma.order.findUnique({
              where: { id: result.orderId },
              select: { totalInPaise: true },
            })
          )!.totalInPaise,
          orderNumber: result.orderNumber,
          customerId: userId,
        });
      }

      return { ok: true, data: result };
    } catch (err) {
      // CheckoutError — user-visible, do not retry
      if (err instanceof CheckoutError) {
        return { ok: false, error: err.message };
      }

      // Prisma unique constraint on orderNumber (P2002) — retry with new number
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        if (attempt < MAX_RETRIES - 1) continue;
        return { ok: false, error: "Please try again — could not generate a unique order number." };
      }

      // Serializable serialization failure (Postgres 40001 / Prisma P2034) — retry
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2034"
      ) {
        if (attempt < MAX_RETRIES - 1) {
          await sleep(BACKOFF_MS[attempt] ?? 800);
          continue;
        }
        return { ok: false, error: "Please try again — the system is busy." };
      }

      // Unknown error
      console.error("[placeOrder] unexpected error:", err);
      return { ok: false, error: "Something went wrong. Please try again." };
    }
  }

  return { ok: false, error: "Please try again — the system is busy." };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
