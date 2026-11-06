import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { ProductPurchase } from "@/components/product-purchase";
import {
  getProductBySlug,
  getProductSlugs,
  getRelatedProducts,
} from "@/db/queries";
import { formatPrice } from "@/lib/catalog";

export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
    openGraph: { images: [product.image.src] },
  };
}

// `params` is awaited inside <Suspense> so the route has a static shell and
// client navigations between products stay instant (Cache Components +
// Partial Prefetching). Known slugs are fully prerendered via generateStaticParams.
export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductDetail params={params} />
    </Suspense>
  );
}

async function ProductDetail({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.categorySlug);

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
          <li>
            <Link
              href={`/categories/${product.categorySlug}`}
              className="hover:text-foreground"
            >
              {product.category}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="lg:container-site lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-20">
        <div className="lg:col-span-7">
          <ProductGallery images={product.gallery} />
        </div>

        <div className="container-site lg:col-span-5 lg:px-0">
          <div className="stack gap-8 py-8 lg:sticky lg:top-32 lg:py-0">
            <header className="stack gap-3">
              <div className="flex items-center gap-3">
                <p className="text-label text-muted">{product.category}</p>
                {product.badge && (
                  <span className="text-label border border-foreground px-2 py-0.5">
                    {product.badge}
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl">{product.name}</h1>
              <p className="text-lg">{formatPrice(product.price)}</p>
              <p className="text-sm text-muted">Colour: {product.color}</p>
            </header>

            <ProductPurchase
              slug={product.id}
              stock={product.stock}
              sizes={product.sizes}
            />

            <div className="hairline-t">
              <details className="accordion" open>
                <summary>Description</summary>
                <p className="pb-6 text-sm leading-relaxed text-muted">{product.description}</p>
              </details>
              <details className="accordion">
                <summary>Details &amp; care</summary>
                <ul className="stack gap-2 pb-6 text-sm text-muted">
                  {product.details.map((d) => (
                    <li key={d} className="flex gap-3">
                      <span aria-hidden="true">–</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </details>
              <details className="accordion">
                <summary>Shipping &amp; returns</summary>
                <p className="pb-6 text-sm leading-relaxed text-muted">
                  Complimentary express shipping on all orders, delivered in
                  signature packaging. Free returns within 30 days of delivery.
                </p>
              </details>
            </div>
          </div>
        </div>
      </div>

      <section aria-labelledby="related-title" className="container-site section">
        <div className="mb-8 stack gap-3 md:mb-12">
          <p className="text-label text-muted">Complete the look</p>
          <h2 id="related-title">You May Also Like</h2>
        </div>
        <div className="grid-products">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </>
  );
}

function ProductSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading product">
      <div className="container-site py-4">
        <div className="h-4 w-48 bg-surface" />
      </div>
      <div className="lg:container-site lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-20">
        <div className="media-product lg:col-span-7" />
        <div className="container-site stack gap-4 py-8 lg:col-span-5 lg:px-0 lg:py-0">
          <div className="h-3 w-24 bg-surface" />
          <div className="h-10 w-3/4 bg-surface" />
          <div className="h-5 w-20 bg-surface" />
          <div className="mt-6 h-12 w-full bg-surface" />
          <div className="h-12 w-full bg-surface" />
        </div>
      </div>
    </div>
  );
}
