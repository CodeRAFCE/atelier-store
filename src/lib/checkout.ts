// Checkout orchestration: ties the order tables (src/db/orders.ts) to Stripe.
// Payment is only ever confirmed from a Checkout Session that this server got
// from Stripe itself: a signature-verified webhook event, or a server-side
// `sessions.retrieve`. Reaching a success URL proves nothing.
import type Stripe from "stripe";
import {
  createPendingOrder,
  findOrderById,
  findOrderBySession,
  findOrderForUser,
  findPendingOrder,
  markOrderPaid,
  markOrderRefunded,
  releaseOrder,
  setCheckoutSession,
  type PaidFacts,
} from "@/db/orders";
import type { CartItem } from "@/lib/cart";
import { getStripe, siteUrl } from "./stripe";

export type SessionOutcome =
  | "confirmed"
  | "already_confirmed"
  | "duplicate"
  | "released"
  | "pending"
  | "review"
  | "refunded"
  | "ignored";

type EventRef = { id: string; type: string };

function factsFrom(session: Stripe.Checkout.Session): PaidFacts | null {
  const orderId = session.metadata?.order_id ?? session.client_reference_id;
  if (!orderId) return null;
  const ship = session.collected_information?.shipping_details;
  const intent = session.payment_intent;
  return {
    orderId,
    sessionId: session.id,
    paymentIntentId: typeof intent === "string" ? intent : (intent?.id ?? null),
    amountTotal: session.amount_total,
    currency: session.currency,
    shippingAddress: ship?.address
      ? {
          name: ship.name ?? null,
          line1: ship.address.line1 ?? null,
          line2: ship.address.line2 ?? null,
          city: ship.address.city ?? null,
          state: ship.address.state ?? null,
          postalCode: ship.address.postal_code ?? null,
          country: ship.address.country ?? null,
        }
      : null,
  };
}

async function refundLatePayment(facts: PaidFacts) {
  if (!facts.paymentIntentId) return;
  await getStripe().refunds.create(
    { payment_intent: facts.paymentIntentId },
    { idempotencyKey: `refund-${facts.orderId}` },
  );
  await markOrderRefunded(facts.orderId);
}

/**
 * Applies what Stripe says about a Checkout Session to our order. Safe to call
 * repeatedly and from several places (webhook, return page): every transition
 * is guarded on the order still being `pending`.
 */
export async function applyCheckoutSession(
  session: Stripe.Checkout.Session,
  event?: EventRef,
): Promise<SessionOutcome> {
  const facts = factsFrom(session);
  if (!facts) return "ignored";

  if (session.payment_status === "paid") {
    const result = await markOrderPaid(facts, event);
    if (result === "late_payment") {
      await refundLatePayment(facts);
      return "refunded";
    }
    if (result === "amount_mismatch") return "review";
    if (result === "unknown") return "ignored";
    return result;
  }

  if (session.status === "expired") {
    const { released, duplicate } = await releaseOrder(facts.orderId, "expired", event);
    return duplicate ? "duplicate" : released ? "released" : "ignored";
  }

  return "pending"; // open, or a delayed payment method still processing
}

/**
 * Closes a customer's open order: expires its Stripe session so it can't be
 * paid any more, then returns the reserved stock. If the session turns out to
 * be paid already, confirms the order instead.
 */
async function closeOpenOrder(
  order: { id: string; stripeCheckoutSessionId: string | null },
  reason: "expired" | "canceled",
): Promise<"closed" | "paid" | "failed"> {
  const sessionId = order.stripeCheckoutSessionId;
  if (sessionId) {
    const stripe = getStripe();
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.expire(sessionId);
    } catch {
      session = await stripe.checkout.sessions.retrieve(sessionId); // already complete/expired
    }
    if (session.payment_status === "paid") {
      await applyCheckoutSession(session);
      return "paid";
    }
    if (session.status !== "expired") return "failed";
  }
  await releaseOrder(order.id, reason);
  return "closed";
}

export type BeginCheckoutResult =
  | { ok: true; url: string; orderId: string }
  | { ok: false; message: string; redirectTo?: string };

/**
 * Starts checkout for a signed-in customer from their cart cookie items.
 * Prices and totals come from Postgres inside `createPendingOrder`; Stripe is
 * only given the resulting order snapshot.
 */
export async function beginCheckout(
  user: { id: string; email: string },
  items: CartItem[],
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

  const created = await createPendingOrder(user, items);
  if (!created.ok) return { ok: false, message: created.message };
  const { order } = created;

  const base = siteUrl();
  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: order.id,
        customer_email: user.email,
        metadata: { order_id: order.id },
        payment_intent_data: { metadata: { order_id: order.id } },
        shipping_address_collection: { allowed_countries: ["US", "CA", "GB"] },
        line_items: order.lines.map((l) => ({
          quantity: l.quantity,
          price_data: {
            currency: order.currency,
            unit_amount: l.unitPriceCents,
            product_data: {
              name: l.size ? `${l.name} (${l.size})` : l.name,
              ...(l.imageUrl?.startsWith("https://") ? { images: [l.imageUrl] } : {}),
            },
          },
        })),
        expires_at: Math.floor(order.expiresAt.getTime() / 1000),
        success_url: `${base}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/checkout/cancel?order=${order.id}`,
      },
      { idempotencyKey: `checkout-${order.id}` },
    );
    if (!session.url) throw new Error("Stripe returned a Checkout Session without a URL");
  } catch (err) {
    console.error("Stripe Checkout Session creation failed", err);
    await releaseOrder(order.id, "expired");
    return { ok: false, message: "We couldn't start payment. Please try again." };
  }

  await setCheckoutSession(order.id, session.id);
  return { ok: true, url: session.url, orderId: order.id };
}

/** The customer backed out of Stripe Checkout: close their order, restock. */
export async function cancelCheckout(userId: string, orderId: string) {
  const order = await findOrderForUser(userId, orderId);
  if (!order || order.status !== "pending") return;
  await closeOpenOrder(order, "canceled");
}

/**
 * Return from Stripe. Asks Stripe for the session's real state and applies it;
 * the `session_id` in the URL only says *which* session to look up.
 */
export async function confirmReturn(userId: string, sessionId: string) {
  const order = await findOrderBySession(userId, sessionId);
  if (!order) return null;
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if ((session.metadata?.order_id ?? session.client_reference_id) === order.id) {
    await applyCheckoutSession(session);
  }
  return (await findOrderById(order.id)) ?? order;
}
