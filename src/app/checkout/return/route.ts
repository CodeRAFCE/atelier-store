import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { writeCart } from "@/lib/cart-cookie";
import { confirmReturn } from "@/lib/checkout";
import { requireUser } from "@/lib/session";

// Stripe sends the customer here after Checkout. The URL only names the
// session: payment state is fetched from Stripe server-side, and the order is
// confirmed (and the bag emptied) only if Stripe says it is paid.
export async function GET(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const user = await requireUser(`${pathname}${search}`);

  const sessionId = request.nextUrl.searchParams.get("session_id") ?? "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) redirect("/cart");

  const order = await confirmReturn(user.id, sessionId);
  if (!order) redirect("/account/orders");

  if (order.paymentStatus === "paid") {
    await writeCart([]);
    revalidateTag("products", { expire: 0 });
    redirect(`/account/orders/${order.id}`);
  }
  // Not paid (yet): the order page explains the state it is really in.
  redirect(`/account/orders/${order.id}`);
}
