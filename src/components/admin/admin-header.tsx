import type { ReactNode } from "react";

export function AdminHeader({
  title,
  eyebrow = "Admin",
  action,
  children,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="stack gap-3 hairline-b pb-8">
      <p className="text-label text-muted">{eyebrow}</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl md:text-5xl">{title}</h1>
        {action}
      </div>
      {children}
    </header>
  );
}

export const adminLoading = <p className="text-sm text-muted">Loading…</p>;
