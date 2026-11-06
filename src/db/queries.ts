// Server-only catalogue reads. Each is cached (Cache Components) and tagged so
// future mutations can invalidate with updateTag/revalidateTag("products").

import { eq, sql } from "drizzle-orm";
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

// Built with the query builder, not a raw sql`` template: inside a relational
// query, raw column refs are re-aliased to the outer table ("products"."id").
function categoryIdBySlug(slug: string) {
  return sql`(${db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))})`;
}

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

/** Most recently added products first; id breaks ties within one insert. */
export async function getNewArrivals(limit = 12): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const rows = await db.query.products.findMany({
    with: withRelations,
    orderBy: (p, { desc }) => [desc(p.createdAt), desc(p.id)],
    limit,
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

  const categoryId = categoryIdBySlug(categorySlug);
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

/** A category's products in merchandised order; empty if the slug is unknown. */
export async function getProductsByCategory(
  categorySlug: string,
): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");

  const categoryId = categoryIdBySlug(categorySlug);
  const rows = await db.query.products.findMany({
    where: (p, { eq }) => eq(p.categoryId, categoryId),
    with: withRelations,
    orderBy: (p, { asc }) => [asc(p.sortOrder), asc(p.id)],
  });
  return rows.map(toProduct);
}

type CategoryRow = typeof categories.$inferSelect;

function toCategory(c: CategoryRow): Category {
  return {
    id: c.slug,
    title: c.name,
    image: { src: c.imageUrl, alt: c.imageAlt },
    href: `/categories/${c.slug}`,
  };
}

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");

  const rows = await db.query.categories.findMany({
    orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.id)],
  });
  return rows.map(toCategory);
}

export async function getCategoryBySlug(
  slug: string,
): Promise<Category | undefined> {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");

  const row = await db.query.categories.findFirst({
    where: (c, { eq }) => eq(c.slug, slug),
  });
  return row ? toCategory(row) : undefined;
}
