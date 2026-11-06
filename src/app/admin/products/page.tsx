import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader, adminLoading } from "@/components/admin/admin-header";
import { adminListProducts } from "@/db/admin";
import { formatCents } from "@/lib/catalog";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Products · Admin",
  robots: { index: false },
};

export default function Page() {
  return (
    <Suspense fallback={adminLoading}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requireAdmin("/admin/products");
  const products = await adminListProducts();

  return (
    <div className="stack gap-8">
      <AdminHeader
        title="Products"
        action={
          <Link href="/admin/products/new" className="btn btn-primary">
            New product
          </Link>
        }
      />
      {products.length === 0 ? (
        <p className="text-sm text-muted">No products yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 text-left text-sm">
            <thead>
              <tr className="text-label text-muted hairline-b">
                <th className="py-3 pr-4 font-normal">Product</th>
                <th className="py-3 pr-4 font-normal">Category</th>
                <th className="py-3 pr-4 text-right font-normal">Price</th>
                <th className="py-3 pr-4 text-right font-normal">Available</th>
                <th className="py-3 font-normal">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.slug} className="hairline-b">
                  <td className="py-4 pr-4">
                    {p.name}
                    {p.badge && <span className="ml-2 text-xs text-muted">{p.badge}</span>}
                  </td>
                  <td className="py-4 pr-4 text-muted">{p.categoryName}</td>
                  <td className="py-4 pr-4 text-right">{formatCents(p.priceCents)}</td>
                  <td className={`py-4 pr-4 text-right ${p.totalStock === 0 ? "text-error" : ""}`}>
                    {p.totalStock === 0 ? "Sold out" : p.totalStock}
                  </td>
                  <td className="py-4 text-right">
                    <Link href={`/admin/products/${p.slug}`} className="link">
                      Edit<span className="sr-only"> {p.name}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
