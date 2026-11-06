import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader, adminLoading } from "@/components/admin/admin-header";
import { ProductForm } from "@/components/admin/product-form";
import { adminListCategories } from "@/db/admin";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "New product · Admin",
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
  await requireAdmin("/admin/products/new");
  const categories = await adminListCategories();

  return (
    <div className="stack gap-8">
      <AdminHeader title="New product" eyebrow="Products" />
      {categories.length === 0 ? (
        <p className="text-sm text-muted">There are no categories to put a product in yet.</p>
      ) : (
        <ProductForm categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />
      )}
    </div>
  );
}
