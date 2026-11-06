import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { expireStaleOrders } from "@/lib/checkout";

// Releases reserved stock for checkouts that were never paid. Razorpay orders
// don't expire by themselves, so this is the only place abandoned checkouts end.
// Scheduled by vercel.json; Vercel sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET is not set", { status: 500 });

  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await expireStaleOrders();
  if (result.released > 0) revalidateTag("products", { expire: 0 });
  return Response.json(result);
}
