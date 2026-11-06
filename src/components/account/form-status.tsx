import type { RefObject } from "react";

export type Status = { tone: "error" | "success"; message: string } | null;

/**
 * Form-level message. Always mounted so screen readers announce changes;
 * errors use role="alert", confirmations role="status".
 */
export function FormStatus({ status, ref }: { status: Status; ref?: RefObject<HTMLDivElement | null> }) {
  const tone = status?.tone ?? "success";
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={tone === "error" ? "alert" : "status"}
      className={
        status
          ? `border-l-2 py-1 pl-4 text-sm outline-none ${
              tone === "error" ? "border-error text-error" : "border-success text-success"
            }`
          : "sr-only"
      }
    >
      {status?.message}
    </div>
  );
}
