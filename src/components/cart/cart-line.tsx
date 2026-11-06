"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { removeFromCart, updateQuantity } from "@/app/cart/actions";
import {
  MAX_QTY,
  type CartActionResult,
  type CartLine as Line,
} from "@/lib/cart";
import { formatPrice } from "@/lib/catalog";

/**
 * One bag row. Quantity controls are capped at the stock the server reported,
 * but the server re-checks live stock on every change.
 */
export function CartLine({ line }: { line: Line }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CartActionResult | null>(null);
  const soldOut = line.available <= 0;
  const max = Math.min(line.available, MAX_QTY);

  const run = (action: () => Promise<CartActionResult>) => {
    setResult(null);
    startTransition(async () => {
      try {
        const res = await action();
        // Success re-renders the row with new data; only surface problems
        // and stock caps.
        if (!res.ok || res.message.startsWith("Only")) setResult(res);
      } catch {
        setResult({
          ok: false,
          message: "We couldn't update your bag. Please try again.",
        });
      }
    });
  };

  const setQty = (qty: number) =>
    run(() => updateQuantity(line.slug, line.size, qty));
  const remove = () => run(() => removeFromCart(line.slug, line.size));

  const notice =
    result?.message ??
    (soldOut
      ? "Sold out. Remove it to continue."
      : line.adjusted
        ? `Quantity reduced to ${line.qty}: only ${line.available} in stock.`
        : line.available <= 5
          ? `Only ${line.available} left in stock.`
          : null);

  return (
    <li
      className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 py-6 hairline-b sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-6"
      aria-busy={pending}
    >
      <Link href={line.href} className="media-product relative block">
        <Image
          src={line.image.src}
          alt={line.image.alt}
          fill
          sizes="8rem"
          loading="eager"
          className={`object-cover ${soldOut ? "opacity-60" : ""}`}
        />
      </Link>

      <div className={`flex flex-col gap-4 ${pending ? "opacity-60" : ""}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="stack gap-1">
            <h2 className="font-sans text-product">
              <Link href={line.href} className="hover:opacity-60">
                {line.name}
              </Link>
            </h2>
            <p className="text-sm text-muted">
              {line.color}
              {line.size && ` · Size ${line.size}`}
            </p>
            <p className="text-sm text-muted">{formatPrice(line.unitPrice)}</p>
          </div>
          <p className="text-product">
            {soldOut ? (
              <span className="text-muted">—</span>
            ) : (
              formatPrice(line.lineTotal)
            )}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-4">
          {soldOut ? (
            <span className="text-label text-muted">Unavailable</span>
          ) : (
            <div className="flex items-center border border-border">
              <button
                type="button"
                className="btn-icon disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={`Decrease quantity of ${line.name}`}
                disabled={pending || line.qty <= 1}
                onClick={() => setQty(line.qty - 1)}
              >
                <span aria-hidden="true">−</span>
              </button>
              <label className="sr-only" htmlFor={`qty-${line.key}`}>
                Quantity of {line.name}
              </label>
              <select
                id={`qty-${line.key}`}
                className="h-11 cursor-pointer appearance-none bg-transparent px-2 text-center text-sm"
                value={line.qty}
                disabled={pending}
                onChange={(e) => setQty(Number(e.target.value))}
              >
                {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-icon disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={`Increase quantity of ${line.name}`}
                disabled={pending || line.qty >= max}
                onClick={() => setQty(line.qty + 1)}
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
          )}
          <button
            type="button"
            className="btn btn-ghost text-muted"
            disabled={pending}
            onClick={remove}
          >
            Remove
          </button>
        </div>

        <p
          role="status"
          className={`text-sm ${result && !result.ok ? "text-error" : "text-muted"}`}
        >
          {notice}
        </p>
      </div>
    </li>
  );
}
