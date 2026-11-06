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
      {orders.map((order) => {
        const { label, tone } = describeOrder(order);
        const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
        const reference = `#${order.id.slice(0, 8).toUpperCase()}`;
        return (
          <li key={order.id} className="hairline-b">
            <Link
              href={`/account/orders/${order.id}`}
              aria-label={`View order ${reference}, ${label}`}
              className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
            >
              <span className="stack gap-2">
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-label">Order {reference}</span>
                  <span className={`text-label ${STATUS_TEXT[tone]}`}>
                    <span aria-hidden="true">● </span>
                    {label}
                  </span>
                </span>
                <span className="text-sm text-muted">
                  <time dateTime={order.createdAt.toISOString()}>
                    {order.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })}
                  </time>{" "}
                  · {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
              </span>

              <span className="text-right">{formatCents(order.totalCents, order.currency)}</span>

              <span className="text-label link-reveal col-span-2 sm:col-span-1">View order</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const STATUS_TEXT = { success: "text-success", error: "text-error", info: "text-muted" } as const;

