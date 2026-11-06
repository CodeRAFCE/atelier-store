// Checkout orchestration: ties the order tables (src/db/orders.ts) to Razorpay.
// A payment is only ever confirmed from a Razorpay payment that this server
// fetched itself, after either a verified `razorpay_signature` (client callback)
// or a verified webhook. A browser claim alone proves nothing.
import {
  createPendingOrder,
  findExpiredPendingOrders,
  findOrderById,
  findOrderByRazorpayOrder,
  findOrderByRazorpayOrderId,
  findOrderForUser,
  findPendingOrder,
  markOrderPaid,
  markOrderRefunded,
  markRefundedByPayment,
  recordPaymentEvent,
  releaseOrder,
  setRazorpayOrder,
  upsertPayment,
  type EventRef,
  type PaidFacts,
  type PaymentRecord,
} from "@/db/orders";
import type { CartItem } from "@/lib/cart";
import { getKeyId, getRazorpay, verifyPaymentSignature } from "@/lib/razorpay";
import type { ShippingAddress } from "@/db/schema";

/** The subset of a Razorpay Payment entity we read. */
export type RzpPayment = {
  id: string;
  order_id: string;
  status: string;
  amount: number; // paise
  currency: string;
  method?: string | null;
  error_code?: string | null;
  error_description?: string | null;
};

export type PaymentOutcome =
  | "confirmed"
  | "already_confirmed"
  | "duplicate"
  | "released"
  | "pending"
  | "failed"
  | "review"
  | "refunded"
  | "ignored";

const PAYMENT_STATUSES = ["created", "authorized", "captured", "failed", "refunded"] as const;

async function fetchPayment(paymentId: string): Promise<RzpPayment> {
  return (await getRazorpay().payments.fetch(paymentId)) as unknown as RzpPayment;
}

function toRecord(orderId: string, p: RzpPayment): PaymentRecord {
  const status = (PAYMENT_STATUSES as readonly string[]).includes(p.status)
    ? (p.status as PaymentRecord["status"])
    : "created";
  return {
    id: p.id,
    orderId,
    status,
    amountCents: p.amount,
    currency: p.currency.toLowerCase(),
    method: p.method ?? null,
    errorCode: p.error_code ?? null,
    errorDescription: p.error_description ?? null,
  };
}

/** Refund the money for an order we can't honour (paid after release). */
async function refundLatePayment(orderId: string, paymentId: string) {
  // No amount given: a full refund of the captured payment.
  const refund = await getRazorpay().payments.refund(paymentId, {
    notes: { order_id: orderId, reason: "late_payment" },
  });
  const refundId = (refund as unknown as { id?: string }).id ?? null;
  await markOrderRefunded(orderId, refundId);
}

/**
 * Refunds only an order that was paid after we had already released it
 * (`stock_released_at` set), flagged `needs_review`, with this payment on it and
 * no refund recorded yet. A genuine amount mismatch has no release timestamp, so
 * it is never auto-refunded. Returns true if a refund was issued.
 */
async function refundIfLate(orderId: string, paymentId: string): Promise<boolean> {
  const o = await findOrderById(orderId);
  if (
    !o ||
    o.status !== "needs_review" ||
    o.paymentStatus !== "paid" ||
    o.razorpayRefundId ||
    !o.stockReleasedAt ||
    o.razorpayPaymentId !== paymentId
  ) {
    return false;
  }
  await refundLatePayment(orderId, paymentId);
  return true;
}

/**
 * Applies a Razorpay payment to our order. Safe to call repeatedly and from
 * several places (callback, webhook, sweeper): every transition is guarded on
 * the order still being `pending`.
 */
export async function applyPayment(
  order: { id: string; razorpayOrderId: string | null },
  payment: RzpPayment,
  event?: EventRef,
): Promise<PaymentOutcome> {
  if (!order.razorpayOrderId || payment.order_id !== order.razorpayOrderId) return "ignored";

  if (payment.status === "captured") {
    await upsertPayment(toRecord(order.id, payment));
    const facts: PaidFacts = {
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
    };
    const result = await markOrderPaid(facts, event);
    if (result === "unknown") return "ignored";
    // The event row is committed together with the state change, so if the
    // refund below fails and Razorpay retries, `markOrderPaid` answers
    // "duplicate" or "amount_mismatch". Re-check the stored facts so a failed
    // refund is retried instead of silently dropped.
    if (result === "late_payment" || result === "duplicate" || result === "amount_mismatch") {
      if (await refundIfLate(order.id, payment.id)) return "refunded";
      if (result !== "duplicate") return "review"; // flagged needs_review, not refunded
    }
    return result;
  }

  // Not captured: record the attempt so it is visible, but don't touch stock.
  await upsertPayment(toRecord(order.id, payment));
  if (payment.status === "failed") return "failed";
  return "pending"; // created / authorized: still in flight
}

/**
 * Closes a customer's open order: makes sure no captured payment is waiting on
 * it, then returns the reserved stock. If a payment has settled, confirms the
 * order instead. If one is still in flight, it does nothing and reports `failed`.
 */
async function closeOpenOrder(
  order: { id: string; razorpayOrderId: string | null },
  reason: "expired" | "canceled",
): Promise<"closed" | "paid" | "failed"> {
  if (order.razorpayOrderId) {
    let payments: RzpPayment[];
    try {
      const res = await getRazorpay().orders.fetchPayments(order.razorpayOrderId);
      payments = (res as unknown as { items: RzpPayment[] }).items ?? [];
    } catch {
      return "failed"; // can't tell whether money moved: don't release
    }
    const captured = payments.find((p) => p.status === "captured");
    if (captured) {
      await applyPayment(order, captured);
      return "paid";
    }
    if (payments.some((p) => p.status === "authorized")) return "failed";
  }
  await releaseOrder(order.id, reason);
  return "closed";
}

/** Orders handled per opportunistic sweep: each one costs a Razorpay call. */
const LAZY_SWEEP_LIMIT = 5;

/**
 * Opportunistic expiry for request paths (checkout, add to bag), because the
 * scheduled sweeper only runs once a day on Vercel Free. Never throws: a failed
 * sweep must not break the customer's action. Returns how many orders were
 * released, so the caller can invalidate the `products` cache tag.
 */
export async function sweepLapsedReservations(): Promise<number> {
  try {
    return (await expireStaleOrders(LAZY_SWEEP_LIMIT)).released;
  } catch (err) {
    console.error("Lazy reservation sweep failed", err);
    return 0;
  }
}

export type BeginCheckoutResult =
  | {
      ok: true;
      orderId: string;
      razorpayOrderId: string;
      keyId: string;
      amount: number;
      currency: string;
    }
  | { ok: false; message: string; redirectTo?: string };

/**
 * Starts checkout for a signed-in customer. Prices and totals come from
 * Postgres inside `createPendingOrder`; Razorpay is only given the resulting
 * amount, which the browser never chooses.
 */
export async function beginCheckout(
  user: { id: string; email: string },
  items: CartItem[],
  address: ShippingAddress,
): Promise<BeginCheckoutResult> {
  // One open checkout per customer: close any earlier one first.
  const open = await findPendingOrder(user.id);
  if (open) {
    const closed = await closeOpenOrder(open, "expired");
    if (closed === "paid") {
      return {
        ok: false,
        message: "Your previous order has just been paid.",
        redirectTo: `/account/orders/${open.id}`,
      };
    }
    if (closed === "failed") {
      return { ok: false, message: "We couldn't close your previous checkout. Please try again." };
    }
  }

  // The daily cron is too slow to free abandoned reservations (Vercel Free), so
  // release other customers' lapsed ones now, or this order could fail as sold out.
  await sweepLapsedReservations();

  const created = await createPendingOrder(user, items, address);
  if (!created.ok) return { ok: false, message: created.message };
  const { order } = created;

  let razorpayOrderId: string;
  let keyId: string;
  try {
    keyId = getKeyId();
    const rzpOrder = await getRazorpay().orders.create({
      amount: order.totalCents,
      currency: order.currency.toUpperCase(),
      receipt: order.id,
      notes: { order_id: order.id },
    });
    razorpayOrderId = rzpOrder.id;
  } catch (err) {
    console.error("Razorpay order creation failed", err);
    await releaseOrder(order.id, "expired");
    return { ok: false, message: "We couldn't start payment. Please try again." };
  }

  await setRazorpayOrder(order.id, razorpayOrderId);
  return {
    ok: true,
    orderId: order.id,
    razorpayOrderId,
    keyId,
    amount: order.totalCents,
    currency: order.currency.toUpperCase(),
  };
}

/** The customer closed the payment modal: close their order, restock. */
export async function cancelCheckout(userId: string, orderId: string) {
  const order = await findOrderForUser(userId, orderId);
  if (!order || order.status !== "pending") return;
  await closeOpenOrder(order, "canceled");
}

/**
 * The client callback after the modal succeeds. Verifies the signature
 * server-side, then fetches the payment from Razorpay and applies that, never
 * the browser's word.
 */
export async function confirmPayment(
  userId: string,
  input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
): Promise<{ orderId: string; outcome: PaymentOutcome } | null> {
  if (
    !verifyPaymentSignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature)
  ) {
    return null;
  }
  const order = await findOrderByRazorpayOrder(userId, input.razorpayOrderId);
  if (!order) return null;

  const payment = await fetchPayment(input.razorpayPaymentId);
  const outcome = await applyPayment(order, payment);
  return { orderId: order.id, outcome };
}

/**
 * Applies one verified webhook event. The caller has checked the signature and
 * dedupe key. Returns "duplicate" for a replayed event; that is still a 200.
 */
export async function applyWebhookEvent(event: {
  id: string;
  type: string;
  payload: Record<string, unknown>;
}): Promise<PaymentOutcome> {
  const ref = { id: event.id, type: event.type };
  const payloadPayment = (event.payload.payment as { entity?: { id: string } } | undefined)
    ?.entity;

  switch (event.type) {
    case "payment.captured":
    case "order.paid": {
      if (!payloadPayment) return "ignored";
      // Re-fetch rather than trust the webhook snapshot.
      const payment = await fetchPayment(payloadPayment.id);
      const order = await findOrderByRazorpayOrderId(payment.order_id);
      if (!order) return "ignored";
      return applyPayment(order, payment, ref);
    }
    case "payment.failed": {
      if (!payloadPayment) return "ignored";
      const payment = await fetchPayment(payloadPayment.id);
      const order = await findOrderByRazorpayOrderId(payment.order_id);
      if (!order) return "ignored";
      const res = await recordPaymentEvent(ref, order.id, toRecord(order.id, payment));
      return res === "duplicate" ? "duplicate" : "failed"; // stock stays reserved for retry
    }
    case "refund.processed": {
      const refund = (event.payload.refund as { entity?: { id: string; payment_id: string } } | undefined)
        ?.entity;
      if (!refund) return "ignored";
      const res = await markRefundedByPayment(refund.payment_id, refund.id, ref);
      return res === "duplicate" ? "duplicate" : "refunded";
    }
    default:
      return "ignored";
  }
}

/**
 * Expiry sweeper: closes pending orders whose reservation has lapsed, and
 * restocks them. Each one goes through `closeOpenOrder`, so a payment that
 * landed in the meantime still wins.
 */
export async function expireStaleOrders(
  limit = 50,
): Promise<{ checked: number; released: number }> {
  const stale = await findExpiredPendingOrders(limit);
  let released = 0;
  for (const order of stale) {
    const outcome = await closeOpenOrder(order, "expired");
    if (outcome === "closed") released++;
  }
  return { checked: stale.length, released };
}
