import { formatPrice } from "@/lib/catalog";
import { CheckoutButton } from "./checkout-button";

export function CartSummary({ subtotal, count, canCheckout }: { subtotal: number; count: number; canCheckout: boolean }) {
  return (
    <section aria-labelledby="summary-title" className="stack gap-6 bg-surface p-6 md:p-8">
      <h2 id="summary-title" className="text-label">
        Order summary
      </h2>
      <dl className="stack gap-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">
            Subtotal ({count} {count === 1 ? "item" : "items"})
          </dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Shipping</dt>
          <dd>Complimentary</dd>
        </div>
        <div className="flex justify-between pt-3 text-base hairline-t">
          <dt>Total</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted">You&apos;ll enter your shipping address and pay securely with Stripe.</p>
      <CheckoutButton disabled={!canCheckout} />
    </section>
  );
}
