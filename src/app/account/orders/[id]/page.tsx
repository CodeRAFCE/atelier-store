import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OrderPending } from "@/components/account/order-pending";
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
  const confirmed = order.status === "confirmed";
  const reference = `#${order.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="stack gap-10">
      <header className="stack gap-3 hairline-b pb-8">
        <Link href="/account/orders" className="text-label link self-start">
          All orders
        </Link>
        <p className="text-label text-muted">
          Order {reference} · {order.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })}
        </p>
        <h1 className="text-4xl md:text-5xl">{confirmed ? "Thank you for your order" : label}</h1>
        <Notice tone={tone} title={confirmed ? "Payment received" : undefined}>
          {confirmed ? (
            <>
              A receipt is on its way to <span className="text-foreground">{order.email}</span>.
              We&apos;ll let you know when your order ships.
            </>
          ) : (
            note
          )}
        </Notice>
        {next === "refresh" && <OrderPending />}
        {next !== "none" && next !== "refresh" && (
          <div className="mt-2 flex flex-wrap gap-3">
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
          <li
            key={item.id}
            className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-4 py-4 hairline-b sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:gap-6"
          >
            <div className="media-product relative">
              {item.imageUrl && (
                <Image src={item.imageUrl} alt="" fill sizes="5rem" className="object-cover" />
              )}
            </div>
            <span className="stack gap-1">
              <Link href={`/products/${item.productSlug}`} className="link">
                {item.name}
              </Link>
              <span className="text-sm text-muted">
                {item.size ? `Size ${item.size} · ` : ""}Qty {item.quantity} ·{" "}
                {money(item.unitPriceCents)} each
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
