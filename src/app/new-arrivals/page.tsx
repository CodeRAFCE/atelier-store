import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getNewArrivals } from "@/db/queries";

export const metadata: Metadata = {
  title: "New Arrivals",
  description: "The latest pieces to arrive from our ateliers.",
};

export default async function NewArrivalsPage() {
  const products = await getNewArrivals();

  return (
    <>
      <nav aria-label="Breadcrumb" className="container-site py-4">
        <ol className="text-label flex flex-wrap items-center gap-2 text-muted">
          <li>
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">
            New Arrivals
          </li>
        </ol>
      </nav>

      <section aria-labelledby="new-arrivals-title" className="container-site pb-16 md:pb-24">
        <header className="mb-8 flex flex-col gap-6 pt-6 hairline-b pb-8 md:mb-12 md:flex-row md:items-end md:justify-between md:pt-10">
          <div className="stack gap-3">
            <p className="text-label text-muted">Just arrived</p>
            <h1 id="new-arrivals-title" className="text-4xl md:text-5xl">
              New Arrivals
            </h1>
            <p className="max-w-md text-sm text-muted">
              The latest pieces from our ateliers, added as they arrive.
            </p>
          </div>
          <p className="text-label text-muted">
            {products.length} {products.length === 1 ? "piece" : "pieces"}
          </p>
        </header>

        {products.length > 0 ? (
          <div className="grid-products">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="stack items-center gap-5 py-16 text-center">
            <p className="text-muted">Nothing new just yet. Check back soon.</p>
            <Link href="/" className="btn btn-secondary">
              Continue shopping
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
