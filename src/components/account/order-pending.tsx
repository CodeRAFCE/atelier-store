"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const INTERVAL_MS = 4000;
const MAX_CHECKS = 10; // ~40s, then hand control back to the customer

/**
 * Shown while an order is still `pending`. Re-runs the server component so the
 * page flips to the confirmed state as soon as Razorpay's verified webhook lands.
 * The status itself always comes from our database, never from this component.
 */
export function OrderPending() {
  const router = useRouter();
  const [checks, setChecks] = useState(0);
  const [refreshing, startTransition] = useTransition();
  const waiting = checks < MAX_CHECKS;

  const check = () => {
    setChecks((n) => n + 1);
    startTransition(() => router.refresh());
  };

  useEffect(() => {
    if (!waiting) return;
    const t = setTimeout(check, INTERVAL_MS);
    return () => clearTimeout(t);
    // `check` only touches stable setters; re-arm after every completed check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checks, waiting]);

  return (
    <div className="stack gap-4" aria-busy={waiting || refreshing}>
      <p role="status" className="flex items-center gap-3 text-sm text-muted">
        {waiting && (
          <svg viewBox="0 0 24 24" className="size-4 shrink-0 animate-spin" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
        {waiting
          ? "Confirming your payment with Razorpay. This page updates on its own."
          : "Confirmation is taking longer than usual. If you've paid, you won't be charged twice, and we'll update this order as soon as it arrives."}
      </p>
      {!waiting && (
        <div>
          <button type="button" className="btn btn-secondary" disabled={refreshing} onClick={check}>
            {refreshing ? "Checking…" : "Check again"}
          </button>
        </div>
      )}
    </div>
  );
}
