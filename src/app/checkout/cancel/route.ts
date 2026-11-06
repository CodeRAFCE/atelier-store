import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { cancelCheckout } from "@/lib/checkout";
import { requireUser } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Stripe sends the customer here when they leave Checkout. Cancels only the
// signed-in customer's own pending order (and restocks it); the bag is kept.
export async function GET(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const user = await requireUser(`${pathname}${search}`);

  const orderId = request.nextUrl.searchParams.get("order") ?? "";
  if (UUID.test(orderId)) {
    await cancelCheckout(user.id, orderId);
    revalidateTag("products", { expire: 0 });
  }
  redirect("/cart?checkout=canceled");
}
