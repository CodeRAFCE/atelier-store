// Server-only Razorpay client and signature helpers. Created lazily so pages
// that never touch payments don't need the keys; the first real call fails
// loudly without them. The key secret and webhook secret never leave the server.
import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";

let client: Razorpay | undefined;

/** Public key id (`rzp_test_…` / `rzp_live_…`). Safe to send to the browser. */
export function getKeyId(): string {
  const keyId = process.env.RAZORPAY_API_KEY;
  if (!keyId || !/^rzp_(test|live)_/.test(keyId)) {
    throw new Error("RAZORPAY_API_KEY is missing or is not a Razorpay key id");
  }
  return keyId;
}

export function getRazorpay(): Razorpay {
  if (client) return client;
  const keySecret = process.env.RAZORPAY_SECRET_KEY;
  if (!keySecret) throw new Error("RAZORPAY_SECRET_KEY is missing");
  client = new Razorpay({ key_id: getKeyId(), key_secret: keySecret });
  return client;
}

function getWebhookSecret(): string {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is missing");
  return secret;
}

function hmacHex(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Checkout `handler` callback check: HMAC-SHA256 of "order_id|payment_id" with
 * the key secret must equal `razorpay_signature`. Proves the payment belongs to
 * this Razorpay order. It does not prove the amount or the status; those are
 * checked against a fetched payment.
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_SECRET_KEY;
  if (!secret) throw new Error("RAZORPAY_SECRET_KEY is missing");
  return safeEqualHex(hmacHex(`${razorpayOrderId}|${razorpayPaymentId}`, secret), signature);
}

/**
 * Webhook check: HMAC-SHA256 of the exact raw request body with the webhook
 * secret must equal `X-Razorpay-Signature`. Must run on the unparsed body.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  return safeEqualHex(hmacHex(rawBody, getWebhookSecret()), signature);
}
