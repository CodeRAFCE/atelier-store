// Client-safe cart types and helpers. Never import the DB here.
//
// The cart cookie stores only what the shopper chose: product slug, size and
// quantity. Names, prices and stock are always re-read from the database on the
// server, so a tampered cookie can't change what anything costs.

import type { ImageRef } from "./catalog";

export const CART_COOKIE = "cart";
export const MAX_QTY = 99;
export const MAX_LINES = 50;

/** One cart entry as stored in the cookie. `size` is null for one-size items. */
export type CartItem = { slug: string; size: string | null; qty: number };

/** A cart entry resolved against current product data. */
export type CartLine = {
  key: string;
  slug: string;
  size: string | null;
  name: string;
  href: string;
  image: ImageRef;
  color: string;
  /** Current unit price in dollars. */
  unitPrice: number;
  /** Quantity after clamping to current stock (0 when sold out). */
  qty: number;
  /** Units currently available for this product/size. */
  available: number;
  /** The stored quantity was more than is now in stock. */
  adjusted: boolean;
  lineTotal: number;
};

export type Cart = {
  lines: CartLine[];
  /** Sum of line totals over available lines, in dollars. */
  subtotal: number;
  /** Total units across available lines. */
  count: number;
};

export type CartActionResult = { ok: boolean; message: string };

export const lineKey = (slug: string, size: string | null) =>
  `${slug}::${size ?? ""}`;

const isQty = (n: unknown): n is number =>
  Number.isInteger(n) && (n as number) >= 1 && (n as number) <= MAX_QTY;

/**
 * Parses the raw cookie value into well-formed, de-duplicated items. Anything
 * malformed is dropped; invalid JSON is an empty cart.
 */
export function parseCartCookie(raw: string | undefined): CartItem[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const seen = new Set<string>();
  const items: CartItem[] = [];
  for (const entry of data) {
    if (items.length >= MAX_LINES) break;
    if (typeof entry !== "object" || entry === null) continue;
    const { slug, size, qty } = entry as Record<string, unknown>;
    if (typeof slug !== "string" || !slug || slug.length > 200) continue;
    if (size !== null && (typeof size !== "string" || size.length > 20)) continue;
    if (!isQty(qty)) continue;
    const key = lineKey(slug, size);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ slug, size, qty });
  }
  return items;
}
