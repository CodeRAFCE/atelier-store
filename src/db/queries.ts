// Server-only catalogue reads. Each is cached (Cache Components) and tagged so
// future mutations can invalidate with updateTag/revalidateTag("products").

import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import type { Category, Product } from "@/lib/catalog";
import { db } from ".";
import { categories } from "./schema";

const withRelations = {
  category: true,
  stock: { orderBy: (s, { asc }) => [asc(s.position)] },
} as const satisfies NonNullable<
  Parameters<typeof db.query.products.findMany>[0]
>["with"];

type ProductRow = NonNullable<
  Awaited<
    ReturnType<
      typeof db.query.products.findFirst<{ with: typeof withRelations }>
    >
  >
>;

function toProduct(row: ProductRow): Product {
  const sized = row.stock.some((s) => s.size !== null);
  const sizes = sized
    ? row.stock
        .filter((s) => s.size !== null)
        .map((s) => ({ label: s.size!, stock: s.quantity }))
    : undefined;

  return {
    id: row.slug,
    name: row.name,
    category: row.category.name,
    categorySlug: row.category.slug,
    price: row.priceCents / 100,
    color: row.color,
    badge: row.badge ?? undefined,
    image: row.images[0],
    gallery: row.images,
    stock: row.stock.reduce((n, s) => n + s.quantity, 0),
    sizes,
    description: row.description,
    details: row.details,
    href: `/products/${row.slug}`,
  };
}

export async function getProducts(): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const rows = await db.query.products.findMany({
    with: withRelations,
    orderBy: (p, { asc }) => [asc(p.sortOrder), asc(p.id)],
  });
  return rows.map(toProduct);
}

export async function getProductSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const rows = await db.query.products.findMany({ columns: { slug: true } });
  return rows.map((r) => r.slug);
}

export async function getProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const row = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.slug, slug),
    with: withRelations,
  });
  return row ? toProduct(row) : undefined;
}

/** Same-category products first, then the rest, excluding the given one. */
export async function getRelatedProducts(
  slug: string,
  categorySlug: string,
  count = 4,
): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const categoryId = sql`(select ${categories.id} from ${categories} where ${categories.slug} = ${categorySlug})`;
  const rows = await db.query.products.findMany({
    where: (p, { ne }) => ne(p.slug, slug),
    with: withRelations,
    orderBy: (p, { asc, desc }) => [
      desc(sql`${p.categoryId} = ${categoryId}`),
      asc(p.sortOrder),
      asc(p.id),
    ],
    limit: count,
  });
  return rows.map(toProduct);
}

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");

  const rows = await db.query.categories.findMany({
    orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.id)],
  });
  return rows.map((c) => ({
    id: c.slug,
    title: c.name,
    image: { src: c.imageUrl, alt: c.imageAlt },
    href: "#",
  }));
}
