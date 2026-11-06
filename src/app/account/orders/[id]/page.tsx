import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Notice } from "@/components/notice";
import { getUserOrder } from "@/db/orders";
import { formatCents } from "@/lib/catalog";
import { describeOrder } from "@/lib/order-status";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Order", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function OrderPage({ params }: PageProps<"/account/orders/[id]">) {
  return (
    <Suspense fallback={<OrderSkeleton />}>
      <OrderDetail params={params} />
    </Suspense>
  );
}

function OrderSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your order" className="stack gap-6">
      <div className="h-10 w-1/2 animate-pulse bg-surface" />
      <div className="h-12 animate-pulse bg-surface" />
      <div className="h-32 animate-pulse bg-surface" />
    </div>
  );
}

async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/account/orders/${id}`);
  if (!UUID.test(id)) notFound();
  const order = await getUserOrder(user.id, id); // scoped to the signed-in customer
  if (!order) notFound();

  const { label, note, tone, next } = describeOrder(order);
  const money = (cents: number) => formatCents(cents, order.currency);

  return (
    <div className="stack gap-10">
      <header className="stack gap-3 hairline-b pb-8">
        <Link href="/account/orders" className="text-label link self-start">
          All orders
        </Link>
        <h1 className="text-4xl md:text-5xl">{label}</h1>
        <Notice tone={tone}>{note}</Notice>
        {next !== "none" && (
          <div className="mt-2 flex flex-wrap gap-3">
            {next === "refresh" && (
              <Link href={`/account/orders/${order.id}`} prefetch={false} className="btn btn-primary">
                Check again
              </Link>
            )}
            {next === "retry" && (
              <Link href="/cart" className="btn btn-primary">
                Return to bag
              </Link>
            )}
            {next === "shop" && (
              <Link href="/new-arrivals" className="btn btn-primary">
                Continue shopping
              </Link>
            )}
          </div>
        )}
      </header>

      <ul className="hairline-t">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-6 py-4 hairline-b">
            <span className="stack gap-1">
              <Link href={`/products/${item.productSlug}`} className="link">
                {item.name}
              </Link>
              <span className="text-sm text-muted">
                {item.size ? `Size ${item.size} · ` : ""}Qty {item.quantity}
              </span>
            </span>
            <span>{money(item.lineTotalCents)}</span>
          </li>
        ))}
      </ul>

      <dl className="stack max-w-sm gap-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd>{money(order.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Shipping</dt>
          <dd>{order.shippingCents === 0 ? "Complimentary" : money(order.shippingCents)}</dd>
        </div>
        <div className="flex justify-between pt-3 text-base hairline-t">
          <dt>Total</dt>
          <dd>{money(order.totalCents)}</dd>
        </div>
      </dl>

      {order.shippingAddress && (
        <section className="stack gap-2 text-sm">
          <h2 className="text-label">Shipping to</h2>
          <address className="not-italic text-muted">
            {[
              order.shippingAddress.name,
              order.shippingAddress.line1,
              order.shippingAddress.line2,
              [order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode]
                .filter(Boolean)
                .join(" "),
              order.shippingAddress.country,
            ]
              .filter(Boolean)
              .map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
          </address>
        </section>
      )}
    </div>
  );
}
