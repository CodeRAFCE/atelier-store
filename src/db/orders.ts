// Order persistence for checkout. No Razorpay or Next imports here, so every
// function takes plain data: prices, stock and totals always come from the
// database rows read below, never from the client or Razorpay.
//
// neon-http has no interactive transactions. Multi-step changes are either
// `db.batch` (atomic) or a single SQL statement with data-modifying CTEs, so a
// stock change can never happen without its matching order change.

import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { MAX_QTY, type CartItem } from "@/lib/cart";
import { db } from ".";
import { availableFor, withStock } from "./cart";
import {
  orderItems,
  orders,
  paymentEvents,
  payments,
  productStock,
  products,
  type ShippingAddress,
} from "./schema";

/**
 * How long a customer's stock reservation lasts without payment. Razorpay
 * orders don't expire on their own, so our sweeper enforces this.
 */
export const CHECKOUT_TTL_MS = 20 * 60 * 1000;

/** True if `err` (or any `cause`) is the named Postgres constraint violation. */
export function hasConstraint(err: unknown, name: string): boolean {
  for (let e: unknown = err; e; e = (e as { cause?: unknown }).cause) {
    const { constraint, message } = e as { constraint?: string; message?: string };
    if (constraint === name || message?.includes(name)) return true;
  }
  return false;
}

export type CheckoutLine = {
  productId: number;
  slug: string;
  name: string;
  size: string | null;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
};

export type PendingOrder = {
  id: string;
  currency: string;
  totalCents: number;
  expiresAt: Date;
  lines: CheckoutLine[];
};

export type CreateOrderResult =
  | { ok: true; order: PendingOrder }
  | { ok: false; code: "empty" | "unavailable" | "sold_out" | "open_order"; message: string };

export const CURRENCY = "inr";

/**
 * Re-reads price and stock from Postgres, then in one atomic batch inserts the
 * order (with its shipping address), its item snapshots, and reserves the
 * stock. Stock is decremented unconditionally; the
 * `product_stock_quantity_nonnegative` CHECK aborts the whole batch if anything
 * was sold meanwhile, so overselling is impossible. Quantities are never
 * clamped here: if the bag no longer fits, nothing is created.
 */
export async function createPendingOrder(
  user: { id: string; email: string },
  items: CartItem[],
  shippingAddress: ShippingAddress,
): Promise<CreateOrderResult> {
  if (items.length === 0) {
    return { ok: false, code: "empty", message: "Your bag is empty." };
  }

  const rows = await db.query.products.findMany({
    where: inArray(products.slug, [...new Set(items.map((i) => i.slug))]),
    with: withStock,
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  const lines: CheckoutLine[] = [];
  for (const item of items) {
    const row = bySlug.get(item.slug);
    const available = row ? availableFor(row, item.size) : null;
    if (!row || available === null || item.qty < 1 || item.qty > MAX_QTY) {
      return {
        ok: false,
        code: "unavailable",
        message: "An item in your bag is no longer available.",
      };
    }
    if (item.qty > available) {
      return {
        ok: false,
        code: "sold_out",
        message: `${row.name} no longer has enough stock. Review your bag and try again.`,
      };
    }
    lines.push({
      productId: row.id,
      slug: row.slug,
      name: row.name,
      size: item.size,
      imageUrl: row.images[0]?.src ?? null,
      unitPriceCents: row.priceCents,
      quantity: item.qty,
    });
  }

  const subtotalCents = lines.reduce((n, l) => n + l.unitPriceCents * l.quantity, 0);
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + CHECKOUT_TTL_MS);

  const statements = [
    db.insert(orders).values({
      id,
      userId: user.id,
      email: user.email,
      currency: CURRENCY,
      subtotalCents,
      totalCents: subtotalCents,
      shippingAddress,
      expiresAt,
    }),
    db.insert(orderItems).values(
      lines.map((l) => ({
        orderId: id,
        productId: l.productId,
        productSlug: l.slug,
        name: l.name,
        size: l.size,
        imageUrl: l.imageUrl,
        unitPriceCents: l.unitPriceCents,
        quantity: l.quantity,
        lineTotalCents: l.unitPriceCents * l.quantity,
      })),
    ),
    ...lines.map((l) =>
      db
        .update(productStock)
        .set({ quantity: sql`${productStock.quantity} - ${l.quantity}` })
        .where(
          and(
            eq(productStock.productId, l.productId),
            l.size === null ? isNull(productStock.size) : eq(productStock.size, l.size),
          ),
        ),
    ),
  ];

  try {
    await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  } catch (err) {
    if (hasConstraint(err, "product_stock_quantity_nonnegative")) {
      return {
        ok: false,
        code: "sold_out",
        message: "Some items just sold out. Review your bag and try again.",
      };
    }
    if (hasConstraint(err, "orders_one_pending_per_user_idx")) {
      return {
        ok: false,
        code: "open_order",
        message: "You already have a checkout in progress.",
      };
    }
    throw err;
  }

  return {
    ok: true,
    order: { id, currency: CURRENCY, totalCents: subtotalCents, expiresAt, lines },
  };
}

/** Stores the Razorpay Order id; only while the order is still pending. */
export async function setRazorpayOrder(orderId: string, razorpayOrderId: string) {
  await db
    .update(orders)
    .set({ razorpayOrderId })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")));
}

export async function findPendingOrder(userId: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.userId, userId), eq(orders.status, "pending")),
  });
}

export async function findOrderForUser(userId: string, orderId: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
  });
}

export async function findOrderByRazorpayOrder(userId: string, razorpayOrderId: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.userId, userId), eq(orders.razorpayOrderId, razorpayOrderId)),
  });
}

export async function findOrderById(orderId: string) {
  return db.query.orders.findFirst({ where: eq(orders.id, orderId) });
}

/** Not user-scoped: only for verified webhook events, never for request input. */
export async function findOrderByRazorpayOrderId(razorpayOrderId: string) {
  return db.query.orders.findFirst({ where: eq(orders.razorpayOrderId, razorpayOrderId) });
}

/** Pending orders whose reservation has lapsed; used by the expiry sweeper. */
export async function findExpiredPendingOrders(limit = 50) {
  return db.query.orders.findMany({
    where: and(eq(orders.status, "pending"), lt(orders.expiresAt, new Date())),
    limit,
  });
}

export async function listUserOrders(userId: string) {
  return db.query.orders.findMany({
    where: eq(orders.userId, userId),
    orderBy: desc(orders.createdAt),
    with: { items: true },
  });
}

export async function getUserOrder(userId: string, orderId: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
    with: { items: { orderBy: (i, { asc }) => [asc(i.id)] } },
  });
}

/** A Razorpay webhook delivery (or any event we dedupe): id is the event id. */
export type EventRef = { id: string; type: string } | undefined;

const eventInsert = (orderId: string, event: EventRef) =>
  event
    ? sql`, ev AS (INSERT INTO payment_events (id, type, order_id) VALUES (${event.id}, ${event.type}, ${orderId}::uuid))`
    : sql``;

const count = (res: unknown) =>
  Number((res as { rows: { n: number | string }[] }).rows[0]?.n ?? 0);

export type ReleaseReason = "expired" | "canceled";

/**
 * Closes a still-pending order and returns its reserved stock, in one
 * statement. The stock goes back only if this statement really moved the order
 * out of `pending`, so a release can happen at most once. Passing an event makes
 * the call fail with `duplicate` on a replayed event id.
 */
export async function releaseOrder(
  orderId: string,
  reason: ReleaseReason,
  event?: EventRef,
): Promise<{ released: boolean; duplicate: boolean }> {
  try {
    const res = await db.execute(sql`
      WITH t AS (
        UPDATE orders
        SET status = ${reason}, stock_released_at = now(), updated_at = now()
        WHERE id = ${orderId}::uuid AND status = 'pending'
        RETURNING id
      ), rel AS (
        UPDATE product_stock ps
        SET quantity = ps.quantity + oi.quantity
        FROM order_items oi
        WHERE oi.order_id IN (SELECT id FROM t)
          AND ps.product_id = oi.product_id
          AND ps.size IS NOT DISTINCT FROM oi.size
        RETURNING ps.id
      ) ${eventInsert(orderId, event)}
      SELECT (SELECT count(*) FROM t)::int AS n
    `);
    return { released: count(res) === 1, duplicate: false };
  } catch (err) {
    if (hasConstraint(err, "payment_events_pkey")) return { released: false, duplicate: true };
    throw err;
  }
}

/** What Razorpay reports about a captured payment; see `lib/checkout.ts`. */
export type PaidFacts = {
  orderId: string;
  razorpayOrderId: string;
  paymentId: string;
  amount: number; // minor units, as fetched from Razorpay
  currency: string;
};

export type PaidResult =
  | "confirmed" // this call confirmed the order
  | "already_confirmed"
  | "duplicate" // replayed webhook event
  | "amount_mismatch" // flagged needs_review, stock kept, no refund
  | "late_payment" // paid after the order was released; flagged, needs refund
  | "unknown";

/**
 * Confirms an order as paid, only if it is still pending, belongs to this
 * Razorpay order and the captured amount and currency equal the total we
 * stored. The caller must have verified the payment with Razorpay (signature
 * check plus a server-side fetch, or a verified webhook), never a browser claim.
 */
export async function markOrderPaid(facts: PaidFacts, event?: EventRef): Promise<PaidResult> {
  try {
    const res = await db.execute(sql`
      WITH t AS (
        UPDATE orders
        SET status = 'confirmed', payment_status = 'paid', paid_at = now(),
            razorpay_payment_id = ${facts.paymentId},
            updated_at = now()
        WHERE id = ${facts.orderId}::uuid
          AND status = 'pending'
          AND razorpay_order_id = ${facts.razorpayOrderId}
          AND total_cents = ${facts.amount}
          AND currency = ${facts.currency.toLowerCase()}
        RETURNING id
      ) ${eventInsert(facts.orderId, event)}
      SELECT (SELECT count(*) FROM t)::int AS n
    `);
    if (count(res) === 1) return "confirmed";
  } catch (err) {
    if (hasConstraint(err, "payment_events_pkey")) return "duplicate";
    throw err;
  }

  const order = await findOrderById(facts.orderId);
  if (!order || order.razorpayOrderId !== facts.razorpayOrderId) return "unknown";
  if (order.status === "confirmed") return "already_confirmed";
  if (order.status === "needs_review") return "amount_mismatch"; // already flagged

  // Money was taken but we can't honour it automatically: keep the evidence.
  await db
    .update(orders)
    .set({
      status: "needs_review",
      paymentStatus: "paid",
      paidAt: sql`coalesce(${orders.paidAt}, now())`,
      razorpayPaymentId: facts.paymentId,
    })
    .where(and(eq(orders.id, facts.orderId), eq(orders.razorpayOrderId, facts.razorpayOrderId)));
  return order.status === "pending" ? "amount_mismatch" : "late_payment";
}

export async function markOrderRefunded(orderId: string, refundId: string | null) {
  await db
    .update(orders)
    .set({ paymentStatus: "refunded", razorpayRefundId: refundId })
    .where(and(eq(orders.id, orderId), eq(orders.status, "needs_review")));
}

export type PaymentRecord = {
  id: string;
  orderId: string;
  status: "created" | "authorized" | "captured" | "failed" | "refunded";
  amountCents: number;
  currency: string;
  method: string | null;
  errorCode: string | null;
  errorDescription: string | null;
};

/**
 * Records what Razorpay says about one payment attempt, and the event that said
 * it, in one atomic batch. A replayed event fails the event insert and writes
 * nothing. Returns `duplicate` in that case.
 */
export async function recordPaymentEvent(
  event: { id: string; type: string },
  orderId: string,
  payment: PaymentRecord | null,
): Promise<"recorded" | "duplicate"> {
  // The event insert goes first: if it conflicts, the batch aborts before the
  // payment row is touched.
  const statements = [
    db.insert(paymentEvents).values({ id: event.id, type: event.type, orderId }),
    ...(payment
      ? [
          db
            .insert(payments)
            .values(payment)
            .onConflictDoUpdate({
              target: payments.id,
              set: {
                status: payment.status,
                method: payment.method,
                errorCode: payment.errorCode,
                errorDescription: payment.errorDescription,
              },
            }),
        ]
      : []),
  ];
  try {
    await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
    return "recorded";
  } catch (err) {
    if (hasConstraint(err, "payment_events_pkey")) return "duplicate";
    throw err;
  }
}

/**
 * Upserts a payment attempt without a webhook event (the verified callback
 * path). Its state changes come from `markOrderPaid`.
 */
export async function upsertPayment(payment: PaymentRecord) {
  await db
    .insert(payments)
    .values(payment)
    .onConflictDoUpdate({
      target: payments.id,
      set: {
        status: payment.status,
        method: payment.method,
        errorCode: payment.errorCode,
        errorDescription: payment.errorDescription,
      },
    });
}

/** Refund issued outside our late-payment flow (e.g. from the Razorpay dashboard). */
export async function markRefundedByPayment(
  paymentId: string,
  refundId: string | null,
  event: { id: string; type: string },
): Promise<"recorded" | "duplicate"> {
  const orderRow = await db.query.orders.findFirst({
    where: eq(orders.razorpayPaymentId, paymentId),
    columns: { id: true },
  });
  if (!orderRow) return "recorded"; // not one of our orders; nothing to change
  try {
    await db.execute(sql`
      WITH ev AS (
        INSERT INTO payment_events (id, type, order_id)
        VALUES (${event.id}, ${event.type}, ${orderRow.id}::uuid)
      ), o AS (
        UPDATE orders
        SET payment_status = 'refunded', razorpay_refund_id = ${refundId}, updated_at = now()
        WHERE id = ${orderRow.id}::uuid AND payment_status = 'paid'
        RETURNING id
      )
      SELECT 1
    `);
    await db
      .update(payments)
      .set({ status: "refunded" })
      .where(eq(payments.id, paymentId));
    return "recorded";
  } catch (err) {
    if (hasConstraint(err, "payment_events_pkey")) return "duplicate";
    throw err;
  }
}
