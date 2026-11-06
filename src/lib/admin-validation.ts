// Input parsing for admin Server Actions. Everything arrives as `unknown`
// (actions are public POST endpoints), so nothing is trusted until parsed here.
// Client-safe: no DB or server imports.
import { isAllowedImageUrl } from "./image-hosts";
import { SLUG_PATTERN } from "./slug";

export type AdminResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; message: string; field?: string };

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string; field?: string };

const fail = (message: string, field?: string): { ok: false; message: string; field?: string } => ({
  ok: false,
  message,
  field,
});

export type ImageInput = { src: string; alt: string };
export type StockInput = { size: string | null; quantity: number };

export type ProductInput = {
  name: string;
  slug: string;
  categorySlug: string;
  priceCents: number;
  color: string;
  badge: string | null;
  description: string;
  details: string[];
  images: ImageInput[];
};

export const MAX_STOCK = 100_000;
const MAX_PRICE_RUPEES = 10_000_000;
/** Razorpay rejects orders under 100 paise, so no product may cost less. */
const MIN_PRICE_RUPEES = 1;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function text(
  v: unknown,
  field: string,
  label: string,
  max: number,
): Parsed<string> {
  if (typeof v !== "string") return fail(`Enter ${label}.`, field);
  const value = v.trim();
  if (!value) return fail(`Enter ${label}.`, field);
  if (value.length > max) return fail(`Use ${max} characters or fewer for ${label}.`, field);
  return { ok: true, value };
}

function imageUrl(v: unknown, field: string): Parsed<string> {
  const t = text(v, field, "an image URL", 500);
  if (!t.ok) return t;
  if (!isAllowedImageUrl(t.value))
    return fail("Image URLs must be https links on an allowed host (images.unsplash.com).", field);
  return t;
}

export function parseSlug(v: unknown, field = "slug"): Parsed<string> {
  const t = text(v, field, "a slug", 80);
  if (!t.ok) return t;
  if (!SLUG_PATTERN.test(t.value))
    return fail("Use lowercase letters, numbers and single dashes only.", field);
  return t;
}

/** Whole or two-decimal rupees to paise. */
export function parsePriceCents(v: unknown, field = "price"): Parsed<number> {
  const raw = typeof v === "number" ? String(v) : typeof v === "string" ? v.trim() : "";
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return fail("Enter a price like 1499 or 1499.50.", field);
  const rupees = Number(raw);
  if (rupees < MIN_PRICE_RUPEES) return fail("The price must be at least ₹1.", field);
  if (rupees > MAX_PRICE_RUPEES) return fail("That price is too high.", field);
  return { ok: true, value: Math.round(rupees * 100) };
}

export function parseQuantity(v: unknown, field = "quantity"): Parsed<number> {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > MAX_STOCK)
    return fail(`Enter a whole number from 0 to ${MAX_STOCK.toLocaleString("en-IN")}.`, field);
  return { ok: true, value: n };
}

/** Signed whole-number change to stock: non-zero, at most MAX_STOCK either way. */
export function parseDelta(v: unknown, field = "delta"): Parsed<number> {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (
    typeof n !== "number" ||
    !Number.isInteger(n) ||
    n === 0 ||
    Math.abs(n) > MAX_STOCK
  )
    return fail(
      `Enter a whole number other than 0 (up to ${MAX_STOCK.toLocaleString("en-IN")}), like 5 or -3.`,
      field,
    );
  return { ok: true, value: n };
}

export function parseSize(v: unknown, field = "size"): Parsed<string> {
  const t = text(v, field, "a size", 20);
  return t;
}

export function parseStockRows(v: unknown): Parsed<StockInput[]> {
  if (!Array.isArray(v) || v.length === 0 || v.length > 30)
    return fail("Add at least one stock row (up to 30).", "stock");
  const rows: StockInput[] = [];
  const seen = new Set<string>();
  for (const row of v) {
    if (!isObject(row)) return fail("Check the stock rows.", "stock");
    const sizeRaw = typeof row.size === "string" ? row.size.trim() : "";
    let size: string | null = null;
    if (sizeRaw) {
      const s = parseSize(sizeRaw, "stock");
      if (!s.ok) return s;
      size = s.value;
    }
    const key = (size ?? "").toLowerCase();
    if (seen.has(key)) return fail("Each size can only appear once.", "stock");
    seen.add(key);
    const q = parseQuantity(row.quantity, "stock");
    if (!q.ok) return q;
    rows.push({ size, quantity: q.value });
  }
  if (rows.some((r) => r.size === null) && rows.length > 1)
    return fail("Give every row a size, or use a single row with no size for a one-size item.", "stock");
  return { ok: true, value: rows };
}

export function parseProductInput(
  input: unknown,
  opts: { requireStock: boolean },
): Parsed<{ product: ProductInput; stock: StockInput[] }> {
  if (!isObject(input)) return fail("Something went wrong with the form. Please try again.");

  const name = text(input.name, "name", "a name", 120);
  if (!name.ok) return name;
  const slug = parseSlug(input.slug);
  if (!slug.ok) return slug;
  const category = text(input.categorySlug, "categorySlug", "a category", 80);
  if (!category.ok) return category;
  const price = parsePriceCents(input.price);
  if (!price.ok) return price;
  const color = text(input.color, "color", "a colour", 40);
  if (!color.ok) return color;
  const description = text(input.description, "description", "a description", 2000);
  if (!description.ok) return description;

  let badge: string | null = null;
  if (typeof input.badge === "string" && input.badge.trim()) {
    const b = text(input.badge, "badge", "a badge", 24);
    if (!b.ok) return b;
    badge = b.value;
  }

  const rawDetails = Array.isArray(input.details) ? input.details : [];
  if (rawDetails.length > 20) return fail("Use 20 detail lines or fewer.", "details");
  const details: string[] = [];
  for (const d of rawDetails) {
    if (typeof d !== "string") return fail("Check the detail lines.", "details");
    const line = d.trim();
    if (!line) continue;
    if (line.length > 200) return fail("Keep each detail line to 200 characters.", "details");
    details.push(line);
  }

  if (!Array.isArray(input.images) || input.images.length === 0 || input.images.length > 10)
    return fail("Add between 1 and 10 images.", "images");
  const images: ImageInput[] = [];
  for (const img of input.images) {
    if (!isObject(img)) return fail("Check the images.", "images");
    const src = imageUrl(img.src, "images");
    if (!src.ok) return src;
    const alt = text(img.alt, "images", "alt text for every image", 200);
    if (!alt.ok) return alt;
    images.push({ src: src.value, alt: alt.value });
  }

  let stock: StockInput[] = [];
  if (opts.requireStock) {
    const s = parseStockRows(input.stock);
    if (!s.ok) return s;
    stock = s.value;
  }

  return {
    ok: true,
    value: {
      product: {
        name: name.value,
        slug: slug.value,
        categorySlug: category.value,
        priceCents: price.value,
        color: color.value,
        badge,
        description: description.value,
        details,
        images,
      },
      stock,
    },
  };
}
