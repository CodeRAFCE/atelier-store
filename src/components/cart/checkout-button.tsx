"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  cancelCheckoutAction,
  confirmPaymentAction,
  startCheckout,
} from "@/app/checkout/actions";
import { Notice } from "@/components/notice";

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpaySuccess) => void;
  modal: { ondismiss: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

/** Loads Razorpay's checkout.js once, on demand. */
function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the payment window"));
    document.body.appendChild(script);
  });
}

const FIELDS = [
  { name: "name", label: "Full name", autoComplete: "name", required: true },
  { name: "phone", label: "Mobile number", autoComplete: "tel", required: true, inputMode: "tel" as const },
  { name: "line1", label: "Address line 1", autoComplete: "address-line1", required: true },
  { name: "line2", label: "Address line 2 (optional)", autoComplete: "address-line2", required: false },
  { name: "city", label: "City", autoComplete: "address-level2", required: true },
  { name: "state", label: "State", autoComplete: "address-level1", required: true },
  { name: "postalCode", label: "PIN code", autoComplete: "postal-code", required: true, inputMode: "numeric" as const },
];

export function CheckoutButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    setMessage(null);

    startTransition(async () => {
      try {
        // Reserves stock and creates the Razorpay order. The amount is ours.
        const start = await startCheckout(values);
        if (!start.ok) {
          setMessage(start.message);
          return;
        }
        await loadRazorpayScript();
        if (!window.Razorpay) throw new Error("Payment window unavailable");

        let paid = false;
        const rzp = new window.Razorpay({
          key: start.keyId,
          amount: start.amount,
          currency: start.currency,
          name: "Atelier",
          description: "Your order",
          order_id: start.razorpayOrderId,
          prefill: start.prefill,
          theme: { color: "#000000" },
          handler: (response) => {
            paid = true; // set synchronously so the dismiss handler below ignores success
            startTransition(async () => {
              try {
                const confirmed = await confirmPaymentAction({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                });
                if (confirmed.ok) {
                  router.push(`/account/orders/${confirmed.orderId}`);
                } else {
                  setMessage(confirmed.message);
                }
              } catch {
                setMessage("We couldn't confirm your payment. Please check your orders shortly.");
              }
            });
          },
          modal: {
            ondismiss: () => {
              if (paid) return;
              // Closed without paying: give the reserved stock back.
              void cancelCheckoutAction(start.orderId).then(() => router.refresh());
            },
          },
        });
        rzp.open();
      } catch {
        setMessage("Something went wrong. Please try again.");
      }
    });
  }

  if (disabled) {
    return (
      <button type="button" className="btn btn-primary btn-block" disabled>
        Nothing available to buy
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="stack gap-4" aria-busy={pending}>
      <fieldset className="stack gap-3" disabled={pending}>
        <legend className="text-label mb-2">Delivery address</legend>
        {FIELDS.map((f) => (
          <label key={f.name} className="stack gap-1 text-sm">
            <span>{f.label}</span>
            <input
              name={f.name}
              required={f.required}
              autoComplete={f.autoComplete}
              inputMode={f.inputMode}
              className="field"
            />
          </label>
        ))}
      </fieldset>
      <button type="submit" className="btn btn-primary btn-block gap-3" disabled={pending}>
        {pending ? "Securing your order…" : "Continue to payment"}
      </button>
      {pending && (
        <p role="status" className="text-xs text-muted">
          Reserving your items. Please don&apos;t close this page.
        </p>
      )}
      {message && <Notice tone="error">{message}</Notice>}
    </form>
  );
}
