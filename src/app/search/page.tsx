import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { SearchIcon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { getCategories, searchProducts } from "@/db/queries";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the collection by piece, colour or category.",
};

const MAX_QUERY_LENGTH = 100;

function readQuery(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().slice(0, MAX_QUERY_LENGTH);
}

// The heading is part of the static shell; everything that reads
// `searchParams` streams in behind <Suspense>.
export default function SearchPage({ searchParams }: PageProps<"/search">) {
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
            Search
          </li>
        </ol>
      </nav>

      <section aria-labelledby="search-title" className="container-site pb-16 md:pb-24">
        <header className="stack gap-3 pt-6 pb-8 md:pt-10">
          <p className="text-label text-muted">Find a piece</p>
          <h1 id="search-title" className="text-4xl md:text-5xl">
            Search
          </h1>
        </header>

        <Suspense fallback={<SearchForm query="" />}>
          <SearchResults searchParams={searchParams} />
        </Suspense>
      </section>
    </>
  );
}

async function SearchResults({
  searchParams,
}: Pick<PageProps<"/search">, "searchParams">) {
  const query = readQuery((await searchParams).q);
  const products = query ? await searchProducts(query) : [];

  return (
    <>
      <SearchForm query={query} />

      {!query ? (
        <BrowseCategories heading="Or browse by category" />
      ) : products.length > 0 ? (
        <>
          <p role="status" className="text-label mb-6 text-muted md:mb-8">
            {products.length} {products.length === 1 ? "result" : "results"}{" "}
            for “{query}”
          </p>
          <div className="grid-products">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      ) : (
        <div role="status" className="stack gap-3">
          <p>No results for “{query}”.</p>
          <p className="max-w-sm text-sm text-muted">
            Check the spelling or try a broader term, such as a colour or a
            category.
          </p>
          <BrowseCategories heading="Browse by category" />
        </div>
      )}
    </>
  );
}

function SearchForm({ query }: { query: string }) {
  return (
    <Form action="/search" role="search" className="mb-8 md:mb-12">
      <label htmlFor="search-query" className="sr-only">
        Search products
      </label>
      <div className="flex max-w-2xl items-center gap-2">
        {/* Keyed on the query so the field resets on client navigations. */}
        <input
          key={query}
          id="search-query"
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by piece, colour or category"
          maxLength={MAX_QUERY_LENGTH}
          autoComplete="off"
          enterKeyHint="search"
          className="field"
        />
        <button type="submit" className="btn-icon -mr-3 shrink-0" aria-label="Submit search">
          <SearchIcon />
        </button>
      </div>
    </Form>
  );
}

async function BrowseCategories({ heading }: { heading: string }) {
  const categories = await getCategories();
  if (categories.length === 0) return null;

  return (
    <nav aria-label="Categories" className="stack gap-4 pt-6">
      <p className="text-label text-muted">{heading}</p>
      <ul className="flex flex-wrap gap-x-8 gap-y-3">
        {categories.map((c) => (
          <li key={c.id}>
            <Link href={c.href} className="text-label link-reveal">
              {c.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
