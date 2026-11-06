"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { readCart } from "@/lib/cart-cookie";
import { beginCheckout } from "@/lib/checkout";
import { requireUser } from "@/lib/session";

/**
 * Takes no arguments on purpose: the items come from the httpOnly cart cookie
 * and every price and quantity is re-read from Postgres. On success the browser
 * is sent to Stripe; the order is only confirmed later, from Stripe's side.
 */
export async function startCheckout(): Promise<{ message: string }> {
  const user = await requireUser("/cart");
  const result = await beginCheckout(
    { id: user.id, email: user.email },
    await readCart(),
  );

  // Stock was reserved or released, so cached product pages are stale.
  updateTag("products");

  if (!result.ok) {
    if (result.redirectTo) redirect(result.redirectTo);
    return { message: result.message };
  }
  redirect(result.url);
}
