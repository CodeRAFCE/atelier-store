"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addToCart } from "@/app/cart/actions";
import type { CartActionResult } from "@/lib/cart";
import { getStockState, type ProductSize } from "@/lib/catalog";
import { HeartIcon } from "./icons";
import { StockIndicator } from "./stock-indicator";

type Props = {
  slug: string;
  stock: number;
  sizes?: ProductSize[];
};

/**
 * Size selection, stock state and add to bag. The size check here is a UX
 * nicety; addToCart re-validates the size and caps the quantity at live stock.
 */
export function ProductPurchase({ slug, stock, sizes }: Props) {
  const [size, setSize] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<CartActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = sizes?.find((s) => s.label === size);
  const state = getStockState(selected ? selected.stock : stock);
  const soldOut = getStockState(stock).status === "sold_out";

  const addToBag = () => {
    if (sizes && !selected) {
      setError(true);
      return;
    }
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await addToCart(slug, selected?.label ?? null, 1));
      } catch {
        setResult({ ok: false, message: "We couldn't update your bag. Please try again." });
      }
    });
  };

  return (
    <div className="stack gap-6">
      {sizes && (
        <fieldset className="stack gap-3">
          <div className="flex items-center justify-between">
            <legend className="text-label">Size</legend>
            <a href="#" className="text-label link text-muted">
              Size guide
            </a>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {sizes.map((s) => {
              const unavailable = s.stock <= 0;
              const low = getStockState(s.stock).status === "low_stock";
              const isSelected = s.label === size;
              return (
                <label
                  key={s.label}
                  className={`relative flex h-11 items-center justify-center border text-sm transition-colors ${
                    unavailable
                      ? "cursor-not-allowed border-border text-subtle line-through"
                      : isSelected
                        ? "border-foreground bg-foreground text-background"
                        : "cursor-pointer border-border hover:border-foreground"
                  } has-focus-visible:outline has-focus-visible:outline-offset-2`}
                >
                  <input
                    type="radio"
                    name="size"
                    value={s.label}
                    disabled={unavailable}
                    checked={isSelected}
                    onChange={() => {
                      setSize(s.label);
                      setError(false);
                      setResult(null);
                    }}
                    className="sr-only"
                    aria-label={
                      unavailable
                        ? `${s.label}, sold out`
                        : low
                          ? `${s.label}, only ${s.stock} left`
                          : s.label
                    }
                  />
                  {s.label}
                  {low && !isSelected && (
                    <span
                      className="absolute top-1 right-1 size-1.5 rounded-full bg-error"
                      aria-hidden="true"
                    />
                  )}
                </label>
              );
            })}
          </div>
          {error && (
            <p className="text-sm text-error" role="alert">
              Please select a size.
            </p>
          )}
        </fieldset>
      )}

      <StockIndicator state={state} />

      <div className="stack gap-2">
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={soldOut || state.status === "sold_out" || pending}
          aria-busy={pending}
          onClick={addToBag}
        >
          {soldOut ? "Sold out" : pending ? "Adding…" : "Add to bag"}
        </button>
        <button type="button" className="btn btn-secondary btn-block">
          <HeartIcon width={16} height={16} />
          Save to wishlist
        </button>
        <p
          className={`text-sm ${result && !result.ok ? "text-error" : "text-muted"}`}
          role="status"
        >
          {result?.message}
          {result?.ok && (
            <>
              {" "}
              <Link href="/cart" className="link text-foreground">
                View bag
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
