// Server-only Stripe client. Created lazily so builds and pages that never
// touch Stripe don't need the key; the first real call fails loudly without it.
import Stripe from "stripe";

let client: Stripe | undefined;

export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !/^(sk|rk)_(test|live)_/.test(key)) {
    throw new Error("STRIPE_SECRET_KEY is missing or is not a Stripe secret key");
  }
  client = new Stripe(key);
  return client;
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret?.startsWith("whsec_")) {
    throw new Error("STRIPE_WEBHOOK_SECRET is missing or is not a webhook signing secret");
  }
  return secret;
}

/** Absolute site origin for Stripe redirect URLs (the same URL Better Auth trusts). */
export function siteUrl(): string {
  const url = process.env.BETTER_AUTH_URL;
  if (!url) throw new Error("BETTER_AUTH_URL is not set");
  return url.replace(/\/+$/, "");
}
