import type { ReactNode } from "react";

export type NoticeTone = "info" | "error" | "success";

const TONES: Record<NoticeTone, string> = {
  info: "border-foreground",
  error: "border-error text-error",
  success: "border-success",
};

/**
 * Page-level message (checkout cancelled, stock changes, payment outcome).
 * Errors use role="alert"; everything else role="status".
 */
export function Notice({
  tone = "info",
  title,
  children,
  className = "",
}: {
  tone?: NoticeTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`stack gap-1 border-l-2 bg-surface px-4 py-3 text-sm ${TONES[tone]} ${className}`}
    >
      {title && <p className="text-label">{title}</p>}
      {children && <div className={tone === "error" ? "" : "text-muted"}>{children}</div>}
    </div>
  );
}
