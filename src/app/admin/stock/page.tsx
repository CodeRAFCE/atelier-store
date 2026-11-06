import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader, adminLoading } from "@/components/admin/admin-header";
import { StockTable } from "@/components/admin/stock-table";
import { adminListStock } from "@/db/admin";
import { getStockState } from "@/lib/catalog";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Stock · Admin",
  robots: { index: false },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "low", label: "Low stock" },
  { key: "out", label: "Sold out" },
] as const;

type Filter = (typeof FILTERS)[number]["key"];

function readFilter(v: string | string[] | undefined): Filter {
  const f = Array.isArray(v) ? v[0] : v;
  return f === "low" || f === "out" ? f : "all";
}

export default function Page({ searchParams }: PageProps<"/admin/stock">) {
  return (
    <Suspense fallback={adminLoading}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({
  searchParams,
}: Pick<PageProps<"/admin/stock">, "searchParams">) {
  await requireAdmin("/admin/stock");
  const filter = readFilter((await searchParams).filter);
  const all = await adminListStock();
  const rows = all.filter((r) => {
    const s = getStockState(r.quantity).status;
    return filter === "low" ? s === "low_stock" : filter === "out" ? s === "sold_out" : true;
  });

  return (
    <div className="stack gap-8">
      <AdminHeader title="Stock">
        <p className="text-sm text-muted">
          Available units per size. Units held by open checkouts are already deducted.
        </p>
      </AdminHeader>
      <nav aria-label="Filter stock" className="flex gap-4 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/admin/stock" : `/admin/stock?filter=${f.key}`}
            className={f.key === filter ? "link" : "text-muted"}
            aria-current={f.key === filter ? "page" : undefined}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nothing matches this filter.</p>
      ) : (
        <StockTable rows={rows} />
      )}
    </div>
  );
}
