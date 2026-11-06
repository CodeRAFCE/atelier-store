import { createHash } from "node:crypto";
import { applyWebhookEvent } from "@/lib/checkout";
import { verifyWebhookSignature } from "@/lib/razorpay";

// Not covered by proxy.ts and not session-authenticated: the Razorpay signature
// over the raw body is the only credential, so the body must stay unparsed
// until it has been verified.
export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  // Config errors throw here (500), distinct from a bad signature (400).
  const rawBody = await request.text();
  if (!verifyWebhookSignature(rawBody, signature)) {
    return new Response("Invalid signature", { status: 400 });
  }

  let event: { event?: string; payload?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!event.event) return new Response("Missing event type", { status: 400 });

  // Dedupe key: Razorpay's event id header. Fall back to a hash of the body so a
  // replayed delivery is still caught if the header is absent.
  const id =
    request.headers.get("x-razorpay-event-id") ??
    createHash("sha256").update(rawBody).digest("hex");

  try {
    await applyWebhookEvent({ id, type: event.event, payload: event.payload ?? {} });
  } catch (err) {
    console.error(`Razorpay webhook ${id} (${event.event}) failed`, err);
    return new Response("Webhook handler failed", { status: 500 }); // Razorpay retries
  }

  return Response.json({ received: true });
}
