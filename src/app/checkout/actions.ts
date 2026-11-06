"use server";

import { updateTag } from "next/cache";
import { getCart } from "@/db/cart";
import { writeCart, readCart } from "@/lib/cart-cookie";
import { parseAddress } from "@/lib/address";
import { beginCheckout, cancelCheckout, confirmPayment } from "@/lib/checkout";
import { requireUser } from "@/lib/session";

export type StartCheckoutResult =
  | {
      ok: true;
      orderId: string;
      razorpayOrderId: string;
      keyId: string;
      amount: number; // paise, from our database
      currency: string;
      prefill: { name: string; email: string; contact: string };
    }
  | { ok: false; message: string };

/**
 * Takes only the shipping address. Items come from the httpOnly cart cookie and
 * every price and quantity is re-read from Postgres. The browser gets back the
 * key id and the amount to show in the Razorpay modal; the payment itself is
 * only confirmed later, from Razorpay's side.
 */
export async function startCheckout(input: unknown): Promise<StartCheckoutResult> {
  const user = await requireUser("/cart");

  const address = parseAddress(input);
  if (!address.ok) return { ok: false, message: address.message };

  // Check out exactly what the bag page shows: unknown products and sold-out
  // lines are dropped and quantities are clamped to current stock. Prices and
  // stock are still re-read, and enforced atomically, in createPendingOrder.
  const cart = await getCart(await readCart());
  const items = cart.lines
    .filter((l) => l.qty > 0)
    .map((l) => ({ slug: l.slug, size: l.size, qty: l.qty }));

  const result = await beginCheckout(
    { id: user.id, email: user.email },
    items,
    address.address,
  );

  // Stock was reserved or released, so cached product pages are stale.
  updateTag("products");

  if (!result.ok) return { ok: false, message: result.message };
  return {
    ok: true,
    orderId: result.orderId,
    razorpayOrderId: result.razorpayOrderId,
    keyId: result.keyId,
    amount: result.amount,
    currency: result.currency,
    prefill: {
      name: address.address.name ?? "",
      email: user.email,
      contact: address.address.phone ?? "",
    },
  };
}

const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ConfirmPaymentResult = { ok: true; orderId: string } | { ok: false; message: string };

/**
 * The modal's success callback. The three ids are untrusted: the signature is
 * checked on the server and the payment is fetched from Razorpay before the
 * order can change. The bag is emptied only once the order is confirmed.
 */
export async function confirmPaymentAction(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<ConfirmPaymentResult> {
  const user = await requireUser("/cart");

  const valid =
    typeof input?.razorpayOrderId === "string" &&
    /^order_[A-Za-z0-9]+$/.test(input.razorpayOrderId) &&
    typeof input.razorpayPaymentId === "string" &&
    /^pay_[A-Za-z0-9]+$/.test(input.razorpayPaymentId) &&
    typeof input.razorpaySignature === "string" &&
    /^[0-9a-f]{64}$/i.test(input.razorpaySignature);
  if (!valid) return { ok: false, message: "We couldn't verify that payment." };

  const result = await confirmPayment(user.id, input);
  if (!result) {
    return { ok: false, message: "We couldn't verify that payment. Contact support if money was debited." };
  }

  if (result.outcome === "confirmed" || result.outcome === "already_confirmed") {
    await writeCart([]);
  }
  updateTag("products");
  return { ok: true, orderId: result.orderId };
}

/** The customer closed the payment modal: release their reserved stock. */
export async function cancelCheckoutAction(orderId: string): Promise<void> {
  const user = await requireUser("/cart");
  if (ORDER_ID.test(orderId)) {
    await cancelCheckout(user.id, orderId);
    updateTag("products");
  }
}
