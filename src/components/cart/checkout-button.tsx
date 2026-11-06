"use client";

import { useState, useTransition } from "react";
import { startCheckout } from "@/app/checkout/actions";
import { Notice } from "@/components/notice";

export function CheckoutButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function checkout() {
    setMessage(null);
    startTransition(async () => {
      try {
        // On success the action redirects to Stripe and never returns.
        const result = await startCheckout();
        setMessage(result.message);
      } catch {
        setMessage("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="stack gap-3">
      <button
        type="button"
        className="btn btn-primary btn-block gap-3"
        disabled={disabled || pending}
        aria-busy={pending}
        onClick={checkout}
      >
        {pending && (
          <svg viewBox="0 0 24 24" className="size-4 animate-spin" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
        {pending ? "Securing your order…" : disabled ? "Nothing available to buy" : "Checkout"}
      </button>
      {pending && (
        <p role="status" className="text-xs text-muted">
          Reserving your items and taking you to secure payment. Please don&apos;t close this page.
        </p>
      )}
      {message && <Notice tone="error">{message}</Notice>}
    </div>
  );
}
