import type { StockState } from "@/lib/catalog";

const dot: Record<StockState["status"], string> = {
  in_stock: "bg-success",
  low_stock: "bg-error",
  sold_out: "bg-subtle",
};

export function StockIndicator({ state }: { state: StockState }) {
  return (
    <p className="flex items-center gap-2 text-sm" role="status">
      <span className={`size-1.5 rounded-full ${dot[state.status]}`} aria-hidden="true" />
      <span
        className={
          state.status === "sold_out" ? "text-muted" : state.status === "low_stock" ? "text-error" : ""
        }
      >
        {state.label}
      </span>
    </p>
  );
}
