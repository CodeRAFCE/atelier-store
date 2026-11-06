"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addStockSize, removeStockSize, setStock } from "@/app/admin/actions";
import { FormStatus, type Status } from "@/components/account/form-status";
import { getStockState } from "@/lib/catalog";

export type StockEditorRow = { id: number; size: string | null; quantity: number };

/** Per-size quantities for one product. Saves are compare-and-set against the quantity loaded here. */
export function StockEditor({ slug, rows }: { slug: string; rows: StockEditorRow[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);
  const sized = rows.length > 0 && rows.every((r) => r.size !== null);

  async function run(action: () => Promise<{ ok: boolean; message?: string }>, done: string) {
    if (pending) return;
    setPending(true);
    setStatus(null);
    try {
      const res = await action();
      if (res.ok) {
        setStatus({ tone: "success", message: done });
        router.refresh();
      } else {
        setStatus({ tone: "error", message: res.message ?? "That didn't work." });
      }
    } catch {
      setStatus({ tone: "error", message: "We couldn't reach the server. Try again." });
    }
    setPending(false);
  }

  return (
    <div className="stack gap-4" aria-busy={pending}>
      <FormStatus status={status} />
      <ul className="hairline-t">
        {rows.map((row) => (
          <StockRowEditor
            key={`${row.id}:${row.quantity}`}
            row={row}
            canRemove={rows.length > 1}
            disabled={pending}
            onSave={(q) => run(() => setStock(slug, row.id, q, row.quantity), "Stock saved.")}
            onRemove={() => run(() => removeStockSize(slug, row.id), "Size removed.")}
          />
        ))}
      </ul>
      {sized && (
        <AddSize disabled={pending} onAdd={(size, q) => run(() => addStockSize(slug, size, q), "Size added.")} />
      )}
    </div>
  );
}

function StockRowEditor({
  row,
  canRemove,
  disabled,
  onSave,
  onRemove,
}: {
  row: StockEditorRow;
  canRemove: boolean;
  disabled: boolean;
  onSave: (quantity: string) => void;
  onRemove: () => void;
}) {
  const [value, setValue] = useState(String(row.quantity));
  const state = getStockState(row.quantity);
  const label = row.size ?? "One size";

  return (
    <li className="flex flex-wrap items-center gap-4 hairline-b py-3">
      <span className="min-w-20 text-sm">{label}</span>
      <span className={`text-xs ${state.status === "in_stock" ? "text-muted" : "text-error"}`}>
        {state.label}
      </span>
      <input
        aria-label={`Quantity for ${label}`}
        className="field ml-auto w-24 text-right"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-secondary"
        disabled={disabled || value === String(row.quantity)}
        onClick={() => onSave(value)}
      >
        Save
      </button>
      {canRemove && (
        <button type="button" className="btn btn-ghost" disabled={disabled} onClick={onRemove}>
          Remove
        </button>
      )}
    </li>
  );
}

function AddSize({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (size: string, quantity: string) => void;
}) {
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState("0");
  return (
    <div className="flex flex-wrap items-end gap-4">
      <input
        aria-label="New size"
        placeholder="New size"
        className="field w-32"
        value={size}
        maxLength={20}
        disabled={disabled}
        onChange={(e) => setSize(e.target.value)}
      />
      <input
        aria-label="Quantity for new size"
        className="field w-24 text-right"
        inputMode="numeric"
        value={quantity}
        disabled={disabled}
        onChange={(e) => setQuantity(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-secondary"
        disabled={disabled || !size.trim()}
        onClick={() => {
          onAdd(size, quantity);
          setSize("");
          setQuantity("0");
        }}
      >
        Add size
      </button>
    </div>
  );
}
