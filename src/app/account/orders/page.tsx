import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listUserOrders } from "@/db/orders";
import { formatCents } from "@/lib/catalog";
import { describeOrder } from "@/lib/order-status";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

export default function OrdersPage() {
  return (
    <div className="stack gap-10">
      <header className="stack gap-3 hairline-b pb-8">
        <h1 className="text-4xl md:text-5xl">Orders</h1>
        <p className="text-sm text-muted">Your checkout history.</p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <OrderList />
      </Suspense>
    </div>
  );
}

async function OrderList() {
  const user = await requireUser("/account/orders");
  const orders = await listUserOrders(user.id);

  if (orders.length === 0) {
    return <p className="text-sm text-muted">You haven&apos;t placed any orders yet.</p>;
  }

  return (
    <ul className="hairline-t">
      {orders.map((order) => (
        <li key={order.id} className="hairline-b">
          <Link
            href={`/account/orders/${order.id}`}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-5"
          >
            <span className="stack gap-1">
              <span className="text-label">{describeOrder(order).label}</span>
              <span className="text-sm text-muted">
                {order.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })} ·{" "}
                {order.items.reduce((n, i) => n + i.quantity, 0)} items
              </span>
            </span>
            <span>{formatCents(order.totalCents, order.currency)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
