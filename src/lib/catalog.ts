// Client-safe catalogue types and helpers. Never import the DB here: client
// components (product-purchase, product-gallery) depend on this module.

import type { ImageRef } from "@/db/schema";

export type { ImageRef };

export type ProductSize = { label: string; stock: number };

export type Product = {
  /** URL slug; maps to /products/[slug]. */
  id: string;
  name: string;
  /** Category display name. */
  category: string;
  categorySlug: string;
  price: number;
  color: string;
  badge?: string;
  /** Primary image, used on cards. */
  image: ImageRef;
  /** Full PDP gallery; first entry is `image`. */
  gallery: ImageRef[];
  /** Units available; for sized items this is the sum across sizes. */
  stock: number;
  sizes?: ProductSize[];
  description: string;
  details: string[];
  href: string;
};

export type Category = {
  id: string;
  title: string;
  image: ImageRef;
  href: string;
};

const LOW_STOCK_THRESHOLD = 3;

export type StockState = {
  status: "in_stock" | "low_stock" | "sold_out";
  label: string;
};

export function getStockState(stock: number): StockState {
  if (stock <= 0) return { status: "sold_out", label: "Sold out" };
  if (stock <= LOW_STOCK_THRESHOLD)
    return { status: "low_stock", label: `Only ${stock} left` };
  return { status: "in_stock", label: "In stock" };
}

export const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
