"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adjustStock, setStock } from "@/app/admin/actions";
import { FormStatus, type Status } from "@/components/account/form-status";
import { getStockState } from "@/lib/catalog";

export type StockTableRow = {
  id: number;
  productSlug: string;
  productName: string;
  size: string | null;
  quantity: number;
};

/**
 * Stock overview. "Adjust" applies a relative change (safe against concurrent
 * checkouts); "Set" is compare-and-set against the quantity shown in the row.
 */
export function StockTable({ rows }: { rows: StockTableRow[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; message?: string }>, done: string) {
    if (pending) return;
    setPending(true);
    setStatus(null);
    try {
      const res = await action();
      if (res.ok) {
        setStatus({ tone: "success", message: done });
      } else {
        setStatus({ tone: "error", message: res.message ?? "That didn't work." });
      }
      // Refresh on conflicts too, so the row shows the current quantity.
      router.refresh();
    } catch {
      setStatus({ tone: "error", message: "We couldn't reach the server. Try again." });
    }
    setPending(false);
  }

  return (
    <div className="stack gap-4" aria-busy={pending}>
      <FormStatus status={status} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-160 text-left text-sm">
          <thead>
            <tr className="text-label text-muted hairline-b">
              <th className="py-3 pr-4 font-normal">Product</th>
              <th className="py-3 pr-4 font-normal">Size</th>
              <th className="py-3 pr-4 text-right font-normal">Available</th>
              <th className="py-3 pr-4 font-normal">Adjust</th>
              <th className="py-3 font-normal">Set to</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <StockRow
                key={`${row.id}:${row.quantity}`}
                row={row}
                disabled={pending}
                onAdjust={(d) =>
                  run(() => adjustStock(row.productSlug, row.id, d), "Stock adjusted.")
                }
                onSet={(q) =>
                  run(
                    () => setStock(row.productSlug, row.id, q, row.quantity),
                    "Stock saved.",
                  )
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockRow({
  row,
  disabled,
  onAdjust,
  onSet,
}: {
  row: StockTableRow;
  disabled: boolean;
  onAdjust: (delta: string) => void;
  onSet: (quantity: string) => void;
}) {
  const [delta, setDelta] = useState("");
  const [value, setValue] = useState(String(row.quantity));
  const state = getStockState(row.quantity);
  const label = `${row.productName}${row.size ? ` (${row.size})` : ""}`;

  return (
    <tr className="hairline-b">
      <td className="py-3 pr-4">
        <Link href={`/admin/products/${row.productSlug}`} className="link">
          {row.productName}
        </Link>
      </td>
      <td className="py-3 pr-4 text-muted">{row.size ?? "One size"}</td>
      <td
        className={`py-3 pr-4 text-right ${state.status === "in_stock" ? "" : "text-error"}`}
      >
        {row.quantity}
        {state.status !== "in_stock" && (
          <span className="ml-2 text-xs">{state.label}</span>
        )}
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <input
            aria-label={`Change stock by, ${label}`}
            placeholder="+5 / -3"
            className="field w-24 text-right"
            inputMode="numeric"
            value={delta}
            disabled={disabled}
            onChange={(e) => setDelta(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-secondary"
            disabled={disabled || delta.trim() === ""}
            onClick={() => onAdjust(delta)}
          >
            Apply
          </button>
        </div>
      </td>
      <td className="py-3">
        <div className="flex items-center gap-2">
          <input
            aria-label={`Set quantity, ${label}`}
            className="field w-24 text-right"
            inputMode="numeric"
            value={value}
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-ghost"
            disabled={disabled || value === String(row.quantity)}
            onClick={() => onSet(value)}
          >
            Set
          </button>
        </div>
      </td>
    </tr>
  );
}
