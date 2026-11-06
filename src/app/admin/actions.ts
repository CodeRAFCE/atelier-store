"use server";

// Admin Server Actions. These are public POST endpoints, so every action's
// first statement is `await requireAdmin()`: rendering a form only for admins
// is not a boundary. Arguments are `unknown` and parsed before any write.
import { updateTag } from "next/cache";
import {
  adjustStockQuantity,
  addStockSizeRow,
  createProductRow,
  removeStockSizeRow,
  setStockQuantity,
  updateProductRow,
  type WriteResult,
} from "@/db/admin";
import {
  parseDelta,
  parseProductInput,
  parseQuantity,
  parseSize,
  parseSlug,
  type AdminResult,
} from "@/lib/admin-validation";
import { requireAdmin } from "@/lib/session";

const bad = (message: string): AdminResult => ({ ok: false, message });

function invalidate() {
  updateTag("products");
}

function finish(res: WriteResult): AdminResult {
  if (res.ok) invalidate();
  return res;
}

const isId = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v > 0;

export async function createProduct(input: unknown): Promise<AdminResult<{ slug: string }>> {
  await requireAdmin();
  const parsed = parseProductInput(input, { requireStock: true });
  if (!parsed.ok) return parsed;
  const { product, stock } = parsed.value;
  const res = await createProductRow(product, stock);
  if (!res.ok) return res;
  invalidate();
  return { ok: true, slug: product.slug };
}

export async function updateProduct(slug: unknown, input: unknown): Promise<AdminResult> {
  await requireAdmin();
  const key = parseSlug(slug);
  if (!key.ok) return bad("That product no longer exists.");
  const parsed = parseProductInput(
    // The slug is immutable after creation (URLs stay stable); ignore any edit.
    typeof input === "object" && input !== null ? { ...input, slug: key.value } : input,
    { requireStock: false },
  );
  if (!parsed.ok) return parsed;
  return finish(await updateProductRow(key.value, parsed.value.product));
}

export async function setStock(
  slug: unknown,
  stockId: unknown,
  quantity: unknown,
  expected: unknown,
): Promise<AdminResult> {
  await requireAdmin();
  const key = parseSlug(slug);
  if (!key.ok || !isId(stockId)) return bad("That stock row no longer exists.");
  const q = parseQuantity(quantity);
  if (!q.ok) return q;
  const e = parseQuantity(expected, "expected");
  if (!e.ok) return bad("Reload the page and try again.");
  return finish(await setStockQuantity(key.value, stockId, q.value, e.value));
}

export async function adjustStock(
  slug: unknown,
  stockId: unknown,
  delta: unknown,
): Promise<AdminResult> {
  await requireAdmin();
  const key = parseSlug(slug);
  if (!key.ok || !isId(stockId)) return bad("That stock row no longer exists.");
  const d = parseDelta(delta);
  if (!d.ok) return d;
  return finish(await adjustStockQuantity(key.value, stockId, d.value));
}

export async function addStockSize(
  slug: unknown,
  size: unknown,
  quantity: unknown,
): Promise<AdminResult> {
  await requireAdmin();
  const key = parseSlug(slug);
  if (!key.ok) return bad("That product no longer exists.");
  const s = parseSize(size);
  if (!s.ok) return s;
  const q = parseQuantity(quantity);
  if (!q.ok) return q;
  return finish(await addStockSizeRow(key.value, s.value, q.value));
}

export async function removeStockSize(slug: unknown, stockId: unknown): Promise<AdminResult> {
  await requireAdmin();
  const key = parseSlug(slug);
  if (!key.ok || !isId(stockId)) return bad("That stock row no longer exists.");
  return finish(await removeStockSizeRow(key.value, stockId));
}
