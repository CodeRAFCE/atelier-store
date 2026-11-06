// Server-only, uncached reads for the cart. Deliberately not "use cache": the
// cart must see the current price and stock, while the catalogue queries in
// ./queries.ts may be hours old.

import { inArray } from "drizzle-orm";
import {
  lineKey,
  MAX_QTY,
  type Cart,
  type CartItem,
  type CartLine,
} from "@/lib/cart";
import { db } from ".";
import { products } from "./schema";

export const withStock = {
  stock: { orderBy: (s, { asc }) => [asc(s.position)] },
} as const satisfies NonNullable<
  Parameters<typeof db.query.products.findMany>[0]
>["with"];

type ProductWithStock = NonNullable<
  Awaited<
    ReturnType<typeof db.query.products.findFirst<{ with: typeof withStock }>>
  >
>;

/**
 * Units available for one product/size, or null when the product doesn't exist
 * or the size doesn't match it (sized products need a listed size, one-size
 * products need `null`).
 */
export function availableFor(row: ProductWithStock, size: string | null) {
  const sized = row.stock.some((s) => s.size !== null);
  if (sized !== (size !== null)) return null;
  const stock = row.stock.find((s) => s.size === size);
  return stock ? stock.quantity : null;
}

export async function getStockForLine(
  slug: string,
  size: string | null,
): Promise<{ name: string; available: number } | null> {
  const row = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.slug, slug),
    with: withStock,
  });
  if (!row) return null;
  const available = availableFor(row, size);
  return available === null ? null : { name: row.name, available };
}

/**
 * Resolves cookie items against current product data in one query. Unknown
 * products and sizes are dropped; quantities above stock are clamped and
 * flagged; sold-out lines are kept with qty 0 and excluded from the subtotal.
 */
export async function getCart(items: CartItem[]): Promise<Cart> {
  if (items.length === 0) return { lines: [], subtotal: 0, count: 0 };

  const rows = await db.query.products.findMany({
    where: inArray(products.slug, [...new Set(items.map((i) => i.slug))]),
    with: withStock,
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  const lines: CartLine[] = [];
  let subtotalCents = 0;
  let count = 0;

  for (const item of items) {
    const row = bySlug.get(item.slug);
    if (!row) continue;
    const available = availableFor(row, item.size);
    if (available === null) continue;

    const qty = Math.min(item.qty, available, MAX_QTY);
    const lineCents = row.priceCents * qty;
    subtotalCents += lineCents;
    count += qty;

    lines.push({
      key: lineKey(item.slug, item.size),
      slug: row.slug,
      size: item.size,
      name: row.name,
      href: `/products/${row.slug}`,
      image: row.images[0],
      color: row.color,
      unitPrice: row.priceCents / 100,
      qty,
      available,
      adjusted: available > 0 && qty < item.qty,
      lineTotal: lineCents / 100,
    });
  }

  return { lines, subtotal: subtotalCents / 100, count };
}
