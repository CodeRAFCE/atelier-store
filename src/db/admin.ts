// Admin data access. Deliberately uncached (unlike queries.ts): admins must see
// current ids, paise and stock. Nothing here checks the caller's role, so every
// caller (page or Server Action) must `await requireAdmin()` first, and this
// module must never be imported by a client component.
//
// neon-http has no interactive transactions: multi-statement writes use
// `db.batch` and slug subqueries, and guarded changes are single statements.

import { eq, sql } from "drizzle-orm";
import { MAX_STOCK, type ProductInput, type StockInput } from "@/lib/admin-validation";
import { db } from ".";
import { hasConstraint } from "./orders";
import {
  categories,
  productStock,
  products,
  type ImageRef,
} from "./schema";

export type WriteResult =
  | { ok: true }
  | { ok: false; message: string; field?: string };

// ---------------------------------------------------------------- reads

export type AdminStockRow = {
  id: number;
  size: string | null;
  quantity: number;
};

export type AdminProduct = {
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  priceCents: number;
  color: string;
  badge: string | null;
  description: string;
  details: string[];
  images: ImageRef[];
  stock: AdminStockRow[];
  totalStock: number;
};

type ProductRow = Awaited<ReturnType<typeof findProductRows>>[number];

function findProductRows() {
  return db.query.products.findMany({
    with: {
      category: true,
      stock: { orderBy: (s, { asc }) => [asc(s.position), asc(s.id)] },
    },
    orderBy: (p, { asc }) => [asc(p.sortOrder), asc(p.id)],
  });
}

function toAdminProduct(p: ProductRow): AdminProduct {
  return {
    slug: p.slug,
    name: p.name,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    priceCents: p.priceCents,
    color: p.color,
    badge: p.badge,
    description: p.description,
    details: p.details,
    images: p.images,
    stock: p.stock.map((s) => ({ id: s.id, size: s.size, quantity: s.quantity })),
    totalStock: p.stock.reduce((sum, s) => sum + s.quantity, 0),
  };
}

export async function adminListProducts(): Promise<AdminProduct[]> {
  return (await findProductRows()).map(toAdminProduct);
}

export type AdminStockListRow = {
  id: number;
  productSlug: string;
  productName: string;
  size: string | null;
  quantity: number;
};

/** One row per stock record (size), ordered by product then size position. */
export async function adminListStock(): Promise<AdminStockListRow[]> {
  return db
    .select({
      id: productStock.id,
      productSlug: products.slug,
      productName: products.name,
      size: productStock.size,
      quantity: productStock.quantity,
    })
    .from(productStock)
    .innerJoin(products, eq(products.id, productStock.productId))
    .orderBy(products.sortOrder, products.id, productStock.position, productStock.id);
}

export async function adminGetProduct(slug: string): Promise<AdminProduct | null> {
  const row = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: {
      category: true,
      stock: { orderBy: (s, { asc }) => [asc(s.position), asc(s.id)] },
    },
  });
  return row ? toAdminProduct(row) : null;
}

export type AdminCategory = {
  slug: string;
  name: string;
  imageUrl: string;
  imageAlt: string;
  sortOrder: number;
  productCount: number;
};

export async function adminListCategories(): Promise<AdminCategory[]> {
  const rows = await db
    .select({
      slug: categories.slug,
      name: categories.name,
      imageUrl: categories.imageUrl,
      imageAlt: categories.imageAlt,
      sortOrder: categories.sortOrder,
      productCount: sql<number>`(select count(*)::int from products where products.category_id = ${categories.id})`,
    })
    .from(categories)
    .orderBy(categories.sortOrder, categories.id);
  return rows;
}

// --------------------------------------------------------------- writes

const SLUG_TAKEN = (what: string): WriteResult => ({
  ok: false,
  message: `Another ${what} already uses this slug.`,
  field: "slug",
});

export async function createProductRow(
  input: ProductInput,
  stock: StockInput[],
): Promise<WriteResult> {
  try {
    await db.batch([
      db.insert(products).values({
        slug: input.slug,
        categoryId: sql`(select id from ${categories} where ${categories.slug} = ${input.categorySlug})`,
        name: input.name,
        description: input.description,
        priceCents: input.priceCents,
        color: input.color,
        badge: input.badge,
        images: input.images,
        details: input.details,
        sortOrder: sql`(select coalesce(max(sort_order), -1) + 1 from ${products})`,
      }),
      db.insert(productStock).values(
        stock.map((s, position) => ({
          productId: sql`(select id from ${products} where ${products.slug} = ${input.slug})`,
          size: s.size,
          quantity: s.quantity,
          position,
        })),
      ),
    ]);
    return { ok: true };
  } catch (err) {
    if (hasConstraint(err, "products_slug_unique")) return SLUG_TAKEN("product");
    if (hasConstraint(err, "category_id"))
      return { ok: false, message: "Choose a valid category.", field: "categorySlug" };
    throw err;
  }
}

export async function updateProductRow(
  slug: string,
  input: ProductInput,
): Promise<WriteResult> {
  try {
    const updated = await db
      .update(products)
      .set({
        categoryId: sql`(select id from ${categories} where ${categories.slug} = ${input.categorySlug})`,
        name: input.name,
        description: input.description,
        priceCents: input.priceCents,
        color: input.color,
        badge: input.badge,
        images: input.images,
        details: input.details,
      })
      .where(eq(products.slug, slug))
      .returning({ id: products.id });
    if (updated.length === 0) return { ok: false, message: "That product no longer exists." };
    return { ok: true };
  } catch (err) {
    if (hasConstraint(err, "category_id"))
      return { ok: false, message: "Choose a valid category.", field: "categorySlug" };
    throw err;
  }
}

async function stockRowExists(slug: string, stockId: number): Promise<boolean> {
  const res = await db.execute(sql`
    select 1 from product_stock s join products p on p.id = s.product_id
    where s.id = ${stockId} and p.slug = ${slug}`);
  return res.rows.length > 0;
}

/**
 * Compare-and-set in one statement, scoped to the product so ids can't cross
 * products. Applies only if the quantity is still what the admin saw
 * (`expected`), so a stale form can't overwrite a checkout's decrement.
 */
export async function setStockQuantity(
  slug: string,
  stockId: number,
  quantity: number,
  expected: number,
): Promise<WriteResult> {
  const res = await db.execute(sql`
    update product_stock s set quantity = ${quantity}
    from products p
    where s.id = ${stockId} and s.product_id = p.id and p.slug = ${slug}
      and s.quantity = ${expected}
    returning s.id`);
  if (res.rows.length > 0) return { ok: true };
  if (!(await stockRowExists(slug, stockId)))
    return { ok: false, message: "That stock row no longer exists." };
  return {
    ok: false,
    message: "Stock changed since you loaded this page. Reload to see the current quantity.",
  };
}

/**
 * Relative change in one statement: `quantity + delta` is evaluated by Postgres
 * against the live row, so it composes safely with concurrent checkouts.
 */
export async function adjustStockQuantity(
  slug: string,
  stockId: number,
  delta: number,
): Promise<WriteResult> {
  try {
    const res = await db.execute(sql`
      update product_stock s set quantity = s.quantity + ${delta}
      from products p
      where s.id = ${stockId} and s.product_id = p.id and p.slug = ${slug}
        and s.quantity + ${delta} between 0 and ${MAX_STOCK}
      returning s.id`);
    if (res.rows.length > 0) return { ok: true };
  } catch (err) {
    if (!hasConstraint(err, "product_stock_quantity_nonnegative")) throw err;
  }
  if (!(await stockRowExists(slug, stockId)))
    return { ok: false, message: "That stock row no longer exists." };
  return {
    ok: false,
    message: `Stock must stay between 0 and ${MAX_STOCK.toLocaleString("en-IN")}. Check the current quantity.`,
    field: "delta",
  };
}

export async function addStockSizeRow(
  slug: string,
  size: string,
  quantity: number,
): Promise<WriteResult> {
  try {
    // Refuses to add a size to a one-size product (the null-size row).
    const res = await db.execute(sql`
      insert into product_stock (product_id, size, quantity, position)
      select p.id, ${size}, ${quantity},
        coalesce((select max(x.position) + 1 from product_stock x where x.product_id = p.id), 0)
      from products p
      where p.slug = ${slug}
        and not exists (select 1 from product_stock x where x.product_id = p.id and x.size is null)
      returning id`);
    if (res.rows.length === 0)
      return { ok: false, message: "This is a one-size product, or it no longer exists." };
    return { ok: true };
  } catch (err) {
    if (hasConstraint(err, "product_stock_product_size_unique"))
      return { ok: false, message: "That size already exists.", field: "size" };
    throw err;
  }
}

/** Keeps at least one stock row so the product never loses its stock record. */
export async function removeStockSizeRow(
  slug: string,
  stockId: number,
): Promise<WriteResult> {
  const res = await db.execute(sql`
    delete from product_stock s
    using products p
    where s.id = ${stockId} and s.product_id = p.id and p.slug = ${slug}
      and (select count(*) from product_stock x where x.product_id = p.id) > 1
    returning s.id`);
  if (res.rows.length === 0)
    return { ok: false, message: "A product must keep at least one stock row." };
  return { ok: true };
}
