import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CartLine } from "@/components/cart/cart-line";
import { CartSummary } from "@/components/cart/cart-summary";
import { BagIcon } from "@/components/icons";
import { Notice } from "@/components/notice";
import { getCart } from "@/db/cart";
import { readCart } from "@/lib/cart-cookie";

export const metadata: Metadata = { title: "Shopping bag" };

export default function CartPage({ searchParams }: PageProps<"/cart">) {
  return (
    <div className="container-content py-12 md:py-20">
      <h1 className="mb-8 text-4xl md:mb-12 md:text-5xl">Shopping bag</h1>
      <Suspense fallback={<CartSkeleton />}>
        <CartContents searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// Reads the cookie and live price/stock, so it renders per request.
async function CartContents({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const canceled = (await searchParams).checkout === "canceled";
  const cart = await getCart(await readCart());

  if (cart.lines.length === 0) {
    return (
      <div className="stack items-center gap-6 bg-surface px-6 py-16 text-center md:py-24">
        <BagIcon className="size-8 text-muted" />
        <div className="stack gap-2">
          <h2 className="font-sans text-product">Your bag is empty</h2>
          <p className="text-sm text-muted">
            Items you add will appear here, ready for when you are.
          </p>
        </div>
        <Link href="/new-arrivals" className="btn btn-primary">
          Shop new arrivals
        </Link>
      </div>
    );
  }

  const soldOut = cart.lines.filter((l) => l.available <= 0).length;
  const reduced = cart.lines.filter((l) => l.adjusted).length;
  const allSoldOut = soldOut === cart.lines.length;

  return (
    <div className="stack gap-8">
      {canceled && (
        <Notice title="Checkout canceled">
          You haven&apos;t been charged and your bag is saved. Check your items and checkout
          again whenever you&apos;re ready.
        </Notice>
      )}
      {(soldOut > 0 || reduced > 0) && (
        <Notice tone="error" title="Your bag changed">
          {soldOut > 0 &&
            `${soldOut} ${soldOut === 1 ? "item is" : "items are"} sold out and not included in your total. `}
          {reduced > 0 &&
            `${reduced} ${reduced === 1 ? "item was" : "items were"} reduced to the stock available.`}
        </Notice>
      )}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-16">
        <ul className="hairline-t" aria-label="Items in your bag">
          {cart.lines.map((line) => (
            <CartLine key={line.key} line={line} />
          ))}
        </ul>
        <div className="stack gap-4 lg:sticky lg:top-32">
          <CartSummary
            subtotal={cart.subtotal}
            count={cart.count}
            canCheckout={!allSoldOut}
          />
          <Link href="/new-arrivals" className="text-label link self-center">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading your bag"
      className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16"
    >
      <div className="stack gap-6">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="grid grid-cols-[6rem_1fr] gap-4 sm:grid-cols-[8rem_1fr]"
          >
            <div className="media-product" />
            <div className="stack gap-2">
              <div className="h-4 w-1/2 bg-surface" />
              <div className="h-3 w-1/4 bg-surface" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-64 bg-surface" />
    </div>
  );
}
