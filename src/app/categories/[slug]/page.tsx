import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductCard } from "@/components/product-card";
import {
  getCategories,
  getCategoryBySlug,
  getProductsByCategory,
} from "@/db/queries";

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ slug: c.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const category = await getCategoryBySlug((await params).slug);
  if (!category) return {};
  return {
    title: category.title,
    description: `Shop ${category.title.toLowerCase()} from our ateliers.`,
    openGraph: { images: [category.image.src] },
  };
}

// Same shape as the product page: `params` is awaited inside <Suspense> so the
// route keeps a static shell, and known slugs are prerendered.
export default function CategoryPage({
  params,
}: PageProps<"/categories/[slug]">) {
  return (
    <Suspense fallback={<CategorySkeleton />}>
      <CategoryCollection params={params} />
    </Suspense>
  );
}

async function CategoryCollection({
  params,
}: Pick<PageProps<"/categories/[slug]">, "params">) {
  const { slug } = await params;
  const [category, categories, products] = await Promise.all([
    getCategoryBySlug(slug),
    getCategories(),
    getProductsByCategory(slug),
  ]);
  if (!category) notFound();

  const titleId = "category-title";

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
            {category.title}
          </li>
        </ol>
      </nav>

      <section aria-labelledby={titleId} className="container-site pb-16 md:pb-24">
        <header className="flex flex-col gap-6 pt-6 pb-8 md:flex-row md:items-end md:justify-between md:pt-10">
          <div className="stack gap-3">
            <p className="text-label text-muted">Shop by category</p>
            <h1 id={titleId} className="text-4xl md:text-5xl">
              {category.title}
            </h1>
          </div>
          <p className="text-label text-muted">
            {products.length} {products.length === 1 ? "piece" : "pieces"}
          </p>
        </header>

        <nav aria-label="Categories" className="mb-8 hairline-b md:mb-12">
          <ul className="scrollbar-none -mx-gutter flex gap-8 overflow-x-auto px-gutter md:mx-0 md:px-0">
            {categories.map((c) => {
              const current = c.id === category.id;
              return (
                <li key={c.id} className="shrink-0">
                  <Link
                    href={c.href}
                    aria-current={current ? "page" : undefined}
                    className={`text-label -mb-px block border-b py-4 whitespace-nowrap transition-colors ${
                      current
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted hover:text-foreground"
                    }`}
                  >
                    {c.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {products.length > 0 ? (
          <div className="grid-products">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="stack items-center gap-5 py-16 text-center">
            <p className="text-muted">
              Nothing in {category.title.toLowerCase()} just yet. Check back
              soon.
            </p>
            <Link href="/new-arrivals" className="btn btn-secondary">
              Shop new arrivals
            </Link>
          </div>
        )}
      </section>
    </>
  );
}

function CategorySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading category" className="container-site">
      <div className="py-4">
        <div className="h-4 w-32 bg-surface" />
      </div>
      <div className="stack gap-3 pt-6 pb-8 md:pt-10">
        <div className="h-3 w-28 bg-surface" />
        <div className="h-10 w-56 bg-surface" />
      </div>
      <div className="mb-8 h-12 hairline-b md:mb-12" />
      <div className="grid-products">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="media-product bg-surface" />
        ))}
      </div>
    </div>
  );
}
