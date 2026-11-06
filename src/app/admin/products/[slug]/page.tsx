import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminHeader, adminLoading } from "@/components/admin/admin-header";
import { ProductForm } from "@/components/admin/product-form";
import { StockEditor } from "@/components/admin/stock-editor";
import { adminGetProduct, adminListCategories } from "@/db/admin";
import { requireAdmin } from "@/lib/session";
import { SLUG_PATTERN } from "@/lib/slug";

export const metadata: Metadata = {
  title: "Edit product · Admin",
  robots: { index: false },
};

export default function Page({ params }: PageProps<"/admin/products/[slug]">) {
  return (
    <Suspense fallback={adminLoading}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Guard before anything else: the layout is not a security check.
  await requireAdmin(`/admin/products/${slug}`);
  if (!SLUG_PATTERN.test(slug)) notFound();

  const [product, categories] = await Promise.all([adminGetProduct(slug), adminListCategories()]);
  if (!product) notFound();

  return (
    <div className="stack gap-12">
      <AdminHeader title={product.name} eyebrow="Products">
        <Link href={`/products/${product.slug}`} className="link self-start text-sm">
          View in store
        </Link>
      </AdminHeader>

      <section className="stack gap-4" aria-labelledby="availability-heading">
        <h2 id="availability-heading" className="text-2xl">
          Availability
        </h2>
        <StockEditor slug={product.slug} rows={product.stock} />
      </section>

      <section className="stack gap-6" aria-labelledby="details-heading">
        <h2 id="details-heading" className="text-2xl">
          Details
        </h2>
        <ProductForm
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          product={{
            slug: product.slug,
            name: product.name,
            categorySlug: product.categorySlug,
            price: String(product.priceCents / 100),
            color: product.color,
            badge: product.badge ?? "",
            description: product.description,
            details: product.details.join("\n"),
            images: product.images,
          }}
        />
      </section>
    </div>
  );
}
