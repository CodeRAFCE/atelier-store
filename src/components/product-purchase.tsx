"use client";

import { useState } from "react";
import { getStockState, type ProductSize } from "@/lib/catalog";
import { HeartIcon } from "./icons";
import { StockIndicator } from "./stock-indicator";

type Props = {
  productName: string;
  stock: number;
  sizes?: ProductSize[];
};

/**
 * Size selection, stock state and purchase actions.
 * UI only: the bag is not wired to a cart yet.
 */
export function ProductPurchase({ productName, stock, sizes }: Props) {
  const [size, setSize] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [added, setAdded] = useState(false);

  const selected = sizes?.find((s) => s.label === size);
  const state = getStockState(selected ? selected.stock : stock);
  const soldOut = getStockState(stock).status === "sold_out";

  const addToBag = () => {
    if (sizes && !selected) {
      setError(true);
      return;
    }
    setAdded(true);
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
                      setAdded(false);
                    }}
                    className="sr-only"
                    aria-label={unavailable ? `${s.label}, sold out` : s.label}
                  />
                  {s.label}
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
          disabled={soldOut || state.status === "sold_out"}
          onClick={addToBag}
        >
          {soldOut ? "Sold out" : "Add to bag"}
        </button>
        <button type="button" className="btn btn-secondary btn-block">
          <HeartIcon width={16} height={16} />
          Save to wishlist
        </button>
        {added && (
          <p className="text-sm text-muted" role="status">
            {productName}
            {selected ? `, size ${selected.label},` : ""} added to your bag.
          </p>
        )}
      </div>
    </div>
  );
}
