// Replaces the catalogue (categories, products, stock) with the seed data.
// Safe to re-run. Usage: npm run db:seed

import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { categories, products, productStock } from "./schema";
import {
  categories as seedCategories,
  products as seedProducts,
} from "./seed-data";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const db = drizzle({ client: neon(process.env.DATABASE_URL), schema });

const categoryId = (slug: string) =>
  sql`(select ${categories.id} from ${categories} where ${categories.slug} = ${slug})`;
const productId = (slug: string) =>
  sql`(select ${products.id} from ${products} where ${products.slug} = ${slug})`;

async function main() {
  // A neon-http batch runs as a single transaction, so a failed seed leaves
  // the existing catalogue untouched. Foreign keys are resolved by slug.
  await db.batch([
    db.delete(productStock),
    db.delete(products),
    db.delete(categories),
    db.insert(categories).values(
      seedCategories.map((c, i) => ({
        slug: c.slug,
        name: c.name,
        imageUrl: c.image.src,
        imageAlt: c.image.alt,
        sortOrder: i,
      })),
    ),
    db.insert(products).values(
      seedProducts.map((p, i) => ({
        slug: p.slug,
        categoryId: categoryId(p.categorySlug),
        name: p.name,
        description: p.description,
        priceCents: p.price * 100,
        color: p.color,
        badge: p.badge ?? null,
        images: p.images,
        details: p.details,
        sortOrder: i,
      })),
    ),
    db.insert(productStock).values(
      seedProducts.flatMap((p) =>
        p.stock.map((s, i) => ({
          productId: productId(p.slug),
          size: s.size,
          quantity: s.quantity,
          position: i,
        })),
      ),
    ),
  ]);

  const stockRows = seedProducts.reduce((n, p) => n + p.stock.length, 0);
  console.log(
    `Seeded ${seedCategories.length} categories, ${seedProducts.length} products, ${stockRows} stock rows.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
