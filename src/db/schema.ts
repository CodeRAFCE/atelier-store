import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export type ImageRef = { src: string; alt: string };

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  imageAlt: text("image_alt").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    /** URL key; maps to /products/[slug]. */
    slug: text("slug").notNull().unique(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    priceCents: integer("price_cents").notNull(),
    color: text("color").notNull(),
    badge: text("badge"),
    /** Ordered gallery; the first entry is the card image. */
    images: jsonb("images").$type<ImageRef[]>().notNull(),
    details: text("details").array().notNull().default(sql`'{}'::text[]`),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("products_category_id_idx").on(t.categoryId),
    check("products_price_cents_nonnegative", sql`${t.priceCents} >= 0`),
  ],
);

/**
 * Units on hand. One row with `size = null` for one-size items, or one row
 * per size for sized items. Not a variant: no SKU or price of its own.
 */
export const productStock = pgTable(
  "product_stock",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: text("size"),
    quantity: integer("quantity").notNull().default(0),
    /** Display order of sizes (XS, S, M, …). */
    position: integer("position").notNull().default(0),
  },
  (t) => [
    unique("product_stock_product_size_unique")
      .on(t.productId, t.size)
      .nullsNotDistinct(),
    check("product_stock_quantity_nonnegative", sql`${t.quantity} >= 0`),
  ],
);

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "canceled",
  "expired",
  "needs_review",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type ShippingAddress = {
  name: string | null;
  phone?: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

const sqlList = (values: readonly string[]) =>
  sql.raw(values.map((v) => `'${v}'`).join(", "));

/**
 * One checkout attempt. Created `pending` with stock reserved; `status` is our
 * order lifecycle, `payment_status` mirrors what Razorpay reports and is only
 * ever set from a verified signature or a server-side Razorpay fetch.
 * Money is integer minor units (paise for INR), copied from the database at
 * creation time.
 */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    /** Customer email at purchase time. */
    email: text("email").notNull(),
    status: text("status").notNull().default("pending"),
    paymentStatus: text("payment_status").notNull().default("unpaid"),
    currency: text("currency").notNull().default("inr"),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    /** Razorpay Order id (`order_…`); set once the Razorpay order is created. */
    razorpayOrderId: text("razorpay_order_id").unique(),
    /** Razorpay Payment id (`pay_…`) of the payment that settled this order. */
    razorpayPaymentId: text("razorpay_payment_id").unique(),
    /** Razorpay Refund id (`rfnd_…`) once a refund for this order is issued. */
    razorpayRefundId: text("razorpay_refund_id").unique(),
    shippingAddress: jsonb("shipping_address").$type<ShippingAddress>(),
    /** When the stock reservation lapses; the sweeper releases it after this. */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** Set when reserved stock was returned (expired, canceled, failed). */
    stockReleasedAt: timestamp("stock_released_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("orders_user_id_created_at_idx").on(t.userId, t.createdAt),
    /** The expiry sweeper scans pending orders by deadline. */
    index("orders_status_expires_at_idx").on(t.status, t.expiresAt),
    /** At most one open checkout per customer. */
    uniqueIndex("orders_one_pending_per_user_idx")
      .on(t.userId)
      .where(sql`${t.status} = 'pending'`),
    check("orders_status_valid", sql`${t.status} in (${sqlList(ORDER_STATUSES)})`),
    check(
      "orders_payment_status_valid",
      sql`${t.paymentStatus} in (${sqlList(PAYMENT_STATUSES)})`,
    ),
    check(
      "orders_amounts_nonnegative",
      sql`${t.subtotalCents} >= 0 and ${t.shippingCents} >= 0 and ${t.taxCents} >= 0 and ${t.totalCents} >= 0`,
    ),
    check(
      "orders_total_matches_parts",
      sql`${t.totalCents} = ${t.subtotalCents} + ${t.shippingCents} + ${t.taxCents}`,
    ),
    check(
      "orders_confirmed_requires_payment",
      sql`${t.status} <> 'confirmed' or (${t.paymentStatus} = 'paid' and ${t.paidAt} is not null)`,
    ),
  ],
);

/**
 * Snapshot of each purchased line. Name, size and price are copied so history
 * survives catalogue edits; `product_id` keeps the link for stock release.
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    productSlug: text("product_slug").notNull(),
    name: text("name").notNull(),
    /** Null for one-size items, matching `product_stock.size`. */
    size: text("size"),
    imageUrl: text("image_url"),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (t) => [
    index("order_items_order_id_idx").on(t.orderId),
    index("order_items_product_id_idx").on(t.productId),
    unique("order_items_order_product_size_unique")
      .on(t.orderId, t.productId, t.size)
      .nullsNotDistinct(),
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
    check("order_items_unit_price_nonnegative", sql`${t.unitPriceCents} >= 0`),
    check(
      "order_items_line_total_matches",
      sql`${t.lineTotalCents} = ${t.unitPriceCents} * ${t.quantity}`,
    ),
  ],
);

/**
 * Razorpay webhook deliveries already applied. The primary key is the
 * `x-razorpay-event-id` header, so a replayed delivery fails its insert, which
 * is how duplicates are detected.
 */
export const paymentEvents = pgTable("payment_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  orderId: uuid("order_id").references(() => orders.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * One row per Razorpay payment attempt on an order (`pay_…`). Written from the
 * verified callback and from webhooks. A failed attempt is recorded here and
 * does not release stock, because the customer can retry on the same order.
 */
export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(), // Razorpay payment id
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(), // created | authorized | captured | failed | refunded
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    method: text("method"),
    errorCode: text("error_code"),
    errorDescription: text("error_description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("payments_order_id_idx").on(t.orderId),
    check(
      "payments_status_valid",
      sql`${t.status} in ('created', 'authorized', 'captured', 'failed', 'refunded')`,
    ),
  ],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(user, { fields: [orders.userId], references: [user.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  stock: many(productStock),
}));

export const productStockRelations = relations(productStock, ({ one }) => ({
  product: one(products, {
    fields: [productStock.productId],
    references: [products.id],
  }),
}));

export * from "./auth-schema";
