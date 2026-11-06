import { revalidateTag } from "next/cache";
import type Stripe from "stripe";
import { releaseOrder } from "@/db/orders";
import { applyCheckoutSession } from "@/lib/checkout";
import { getStripe, getWebhookSecret } from "@/lib/stripe";

// Not covered by proxy.ts and not session-authenticated: the Stripe signature
// over the raw body is the only credential, so the body must stay unparsed.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  // Config errors throw here (500), distinct from a bad signature (400).
  const stripe = getStripe();
  const secret = getWebhookSecret();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const ref = { id: event.id, type: event.type };
  let stockChanged = false;

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.expired": {
        // Re-fetch rather than trust the payload's snapshot, and so that the
        // amount, status and payment state are exactly what Stripe holds now.
        const session = await getStripe().checkout.sessions.retrieve(event.data.object.id);
        const outcome = await applyCheckoutSession(session, ref);
        stockChanged = outcome === "released" || outcome === "refunded";
        break;
      }
      case "checkout.session.async_payment_failed": {
        const orderId = event.data.object.metadata?.order_id;
        if (orderId) {
          const { released } = await releaseOrder(orderId, "payment_failed", ref);
          stockChanged = released;
        }
        break;
      }
      default:
        break; // payment_intent.payment_failed is ignored: the customer can retry in the same session
    }
  } catch (err) {
    console.error(`Stripe webhook ${event.id} (${event.type}) failed`, err);
    return new Response("Webhook handler failed", { status: 500 }); // Stripe retries
  }

  if (stockChanged) revalidateTag("products", { expire: 0 });
  return Response.json({ received: true });
}
