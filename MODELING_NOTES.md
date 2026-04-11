# MODELING_NOTES.md

## Why `Asset` is a separate table instead of embedded blob keys

Storing a raw Netlify Blobs key string directly on a domain record (e.g. `Product.imageKey`) couples the domain model to the storage layer with no visibility into who uploaded the file, when, or how large it is. A dedicated `Asset` table gives:

- **Auditability** — `uploadedById` + `createdAt` on every file, queryable without touching Netlify.
- **Traceable deletion** — before removing a blob from Netlify, check whether any Asset row still references it. Without a table, orphaned blobs are invisible.
- **Type safety** — `contentType` and `sizeBytes` are stored at write time; the serving Route Handler reads the correct `Content-Type` from the row instead of guessing.
- **Referential integrity** — FK constraints mean the database catches dangling references; a raw string column would silently accept any value.

The tradeoff is one extra JOIN per asset lookup. This is acceptable because asset lookups are not in the hot path; they're used for rendering, not for order or payment processing.

## Why money is `Int` paise everywhere (no `Decimal`, no `Float`)

`Float` arithmetic is inexact in IEEE 754 — `0.1 + 0.2 ≠ 0.3`. Using floats for money silently accumulates rounding errors across aggregations. `Decimal` is exact but Prisma maps it to JavaScript's `Prisma.Decimal` (a wrapper type), requiring explicit conversion at every boundary and making arithmetic awkward. Storing amounts as integer paise (₹1 = 100 paise) eliminates fractional values entirely: all arithmetic is integer arithmetic, all comparisons are exact, and no conversion layer is needed. The convention is enforced by naming — every money field ends in `InPaise` — making it immediately obvious at the call site that the value needs dividing by 100 before display.

## Why `shippingAddressSnapshot` and `productSnapshot` are `Json`

Addresses and product details change after an order is placed. If `OrderItem` held a live FK to `Address`, editing a customer's address would retroactively change the delivery record for every past order. The same applies to product names, SKUs, and prices. Snapshotting the full payload as `Json` at order time decouples the order history from future mutations to the source records. The FK to `Product` and `Address` is still kept for analytics (e.g. "how many orders included product X"), but it is non-authoritative for display purposes — the snapshot is the source of truth for what the customer ordered and where it was sent.

## Why `availableInPaise` is computed, not stored, on `CreditAccount`

`availableInPaise = limitInPaise - outstandingInPaise`. Storing it as a third column creates a three-way invariant that must be kept in sync on every write. Any bug that updates `outstandingInPaise` without updating `availableInPaise` (or vice versa) produces a silently incorrect balance. Since `limit` and `outstanding` are both stored, the available amount is always computable with zero ambiguity. The computation is cheap (one subtraction) and done in application code at the point of use.

## Why `CreditApplicationAsset` is a join table instead of `String[]`

A PostgreSQL `String[]` column holding Asset IDs has no referential integrity — the database cannot enforce that each ID actually exists in the `Asset` table. Deleting an Asset would leave dangling IDs with no error. With a join table (`CreditApplicationAsset`), each row is a proper FK pair: `onDelete: Cascade` on the application side and a constrained FK on the asset side. This also makes it trivial to query "which applications reference asset X" — an array column would require an `ANY(array)` scan with no index support.

## Index tradeoffs

- **`@@unique` implies an index** — fields with `@unique` already have an implicit B-tree index. No separate `@@index` was added on those columns (e.g. `Product.slug`, `Shop.slug`).
- **Composite unique indexes double as FK indexes** — `CartItem.@@unique([cartId, productId, variantId])` covers `cartId` lookups via the leftmost prefix. A separate `@@index([cartId])` would be redundant. Only `@@index([productId])` was added for the non-leftmost FK.
- **`AuditLog` is write-heavy and append-only** — the compound `@@index([entity, entityId])` was chosen over separate indexes to support the primary query pattern ("show all events for entity X"). A separate `@@index([entity])` was omitted because range scans by entity type alone are not a product feature.
- **`SalesLead.@@index([status])`** — added for admin dashboards that filter all leads by status across sellers. Low cardinality enums make this index less selective, but the table is expected to be small enough that the benefit outweighs any overhead.
