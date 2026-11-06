"use server";

// Cart mutations. Arguments come from the browser, so every one is validated,
// and stock is re-read live from the database before the cookie is written.
// Prices are never accepted from the client; the cart page reads them fresh.
// Setting the cookie re-renders the current route (header count, cart page).

import { getStockForLine } from "@/db/cart";
import {
  lineKey,
  MAX_LINES,
  MAX_QTY,
  type CartActionResult,
} from "@/lib/cart";
import { readCart, writeCart } from "@/lib/cart-cookie";

type LineInput = { slug: string; size: string | null };

function parseLine(slug: unknown, size: unknown): LineInput | null {
  if (typeof slug !== "string" || !slug || slug.length > 200) return null;
  if (size !== null && (typeof size !== "string" || !size || size.length > 20))
    return null;
  return { slug, size };
}

const isInt = (n: unknown): n is number => Number.isInteger(n);

const fail = (message: string): CartActionResult => ({ ok: false, message });
const unavailable = fail("This item is no longer available.");

export async function addToCart(
  slug: unknown,
  size: unknown,
  qty: unknown = 1,
): Promise<CartActionResult> {
  const line = parseLine(slug, size);
  if (!line || !isInt(qty) || qty < 1 || qty > MAX_QTY)
    return fail("Please choose a valid size and quantity.");

  const stock = await getStockForLine(line.slug, line.size);
  if (!stock) return unavailable;
  if (stock.available <= 0) return fail("Sorry, this is sold out.");

  const items = await readCart();
  const key = lineKey(line.slug, line.size);
  const existing = items.find((i) => lineKey(i.slug, i.size) === key);
  const limit = Math.min(stock.available, MAX_QTY);
  const current = existing?.qty ?? 0;

  if (current >= limit)
    return fail(
      `Only ${limit} available — your bag already has the maximum.`,
    );
  if (!existing && items.length >= MAX_LINES)
    return fail("Your bag is full. Remove an item to add another.");

  const next = Math.min(current + qty, limit);
  if (existing) existing.qty = next;
  else items.push({ ...line, qty: next });
  await writeCart(items);

  const sizeLabel = line.size ? `, size ${line.size},` : "";
  return next < current + qty
    ? { ok: true, message: `Only ${limit} available — your bag now has the maximum.` }
    : { ok: true, message: `${stock.name}${sizeLabel} added to your bag.` };
}

export async function updateQuantity(
  slug: unknown,
  size: unknown,
  qty: unknown,
): Promise<CartActionResult> {
  const line = parseLine(slug, size);
  if (!line || !isInt(qty) || qty < 0 || qty > MAX_QTY)
    return fail("Please choose a valid quantity.");
  if (qty === 0) return removeFromCart(line.slug, line.size);

  const items = await readCart();
  const key = lineKey(line.slug, line.size);
  const existing = items.find((i) => lineKey(i.slug, i.size) === key);
  if (!existing) return fail("That item isn't in your bag.");

  const stock = await getStockForLine(line.slug, line.size);
  if (!stock) return unavailable;
  if (stock.available <= 0)
    return fail("Sorry, this is now sold out. Please remove it from your bag.");

  existing.qty = Math.min(qty, stock.available);
  await writeCart(items);

  return existing.qty < qty
    ? { ok: true, message: `Only ${stock.available} available.` }
    : { ok: true, message: "Quantity updated." };
}

export async function removeFromCart(
  slug: unknown,
  size: unknown,
): Promise<CartActionResult> {
  const line = parseLine(slug, size);
  if (!line) return fail("That item isn't in your bag.");

  const key = lineKey(line.slug, line.size);
  const items = await readCart();
  await writeCart(items.filter((i) => lineKey(i.slug, i.size) !== key));
  return { ok: true, message: "Item removed." };
}
