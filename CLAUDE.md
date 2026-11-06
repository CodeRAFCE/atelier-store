# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

eCommerce app in early development. The homepage and product pages read products, categories and per-size stock from Postgres (seeded with Unsplash-image placeholder data, allowed via `images.remotePatterns` in `next.config.ts`). Non-catalogue content (brand, navigation, hero, collections, editorial, footer) is static in `src/lib/site-content.ts`. No carts, orders, payments, auth flows or tests yet.

## Design system

All tokens and reusable classes live in `src/app/globals.css` as Tailwind v4 `@theme` tokens and `@utility` classes. Use them instead of ad-hoc values:
- Layout: `container-site`, `container-content`, `container-prose`, `section`, `stack`, `grid-products`, `grid-split`
- Media frames: `media-hero`, `media-portrait`, `media-product` (set the ratio only; add `object-cover` or `object-contain` to the `next/image` `fill` image)
- Type: `text-label`, `text-display`, `text-product`
- Links: `link`, `link-reveal`
- Buttons: `btn` plus `btn-primary`, `btn-secondary`, `btn-inverse`, `btn-outline-inverse`, `btn-ghost` or `btn-icon`
- Borders and forms: `hairline*`, `field`

The palette is reset to monochrome tokens (`background`, `foreground`, `surface`, `muted`, `border` etc.), so Tailwind's default colours (zinc, gray, …) don't exist. Border radii are reset too, so corners are square. The site is light-only.

## Commands

- `npm run dev` / `npm run build` / `npm start` — Next.js
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- `npm run typecheck` — `tsc --noEmit`
- `npm run db:generate` / `db:migrate` / `db:push` / `db:studio` — drizzle-kit (migrations output to `./drizzle`)
- `npm run db:seed` — replaces the catalogue with `src/db/seed-data.ts` (runs via `tsx`)
- No test runner is configured.

## Dev server rule

Whenever you start the dev server (`npm run dev`, e.g. to verify UI in a browser), you must kill its process when you're done, before ending your turn. Never leave it running in the background.

`npm` doesn't forward termination to the Next.js child process, so killing the npm wrapper isn't enough. Kill whatever is listening on the port (default 3000), from PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -Confirm:$false }
```

Then confirm the port is free. That command should return nothing:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
```

## Setup

Copy `.env.example` to `.env.local` and set `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET` (`npx @better-auth/cli secret`) and `BETTER_AUTH_URL`. `src/db/index.ts` throws at import if `DATABASE_URL` is missing, and `src/lib/auth.ts` throws if `BETTER_AUTH_SECRET` is missing or weak (checks in `src/lib/auth-secret.ts`; never relax them to get a build passing).

## Architecture

- Next.js App Router with `src/` and the `@/*` → `src/*` alias. Tailwind v4.
- **Next.js version warning:** `AGENTS.md` says this Next.js version has breaking changes from what you may know. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next code.
- **DB:** `src/db/index.ts` exports `db`, Drizzle over Neon's serverless HTTP driver (`drizzle-orm/neon-http`). Tables go in `src/db/schema.ts`, which `drizzle.config.ts` reads. That config loads `.env.local` and then `.env`. See Database conventions below.
- **Auth:** `src/lib/auth.ts` (server, Better Auth with the Drizzle `pg` adapter, email/password enabled) is exposed via `src/app/api/auth/[...all]/route.ts`. `src/lib/auth-client.ts` is the React client.
- Better Auth's tables are not yet in `schema.ts`. Generate them with `npx @better-auth/cli generate`, add them to the schema, then run the `db:*` migration scripts.

## Database conventions

- **Scope:** the schema covers the catalogue only: `categories` 1─* `products` 1─* `product_stock`. Don't add carts, orders, payments, reviews, wishlists or product variants unless asked.
- **Stock:** one `product_stock` row per size, or a single row with `size = null` for one-size items. A stock row is not a variant (no SKU or price of its own). `quantity >= 0`, and a product's total stock is the sum of its rows.
- **Money:** store integer cents (`price_cents`), never floats. Convert to dollars only in the query mapper.
- **Images:** `products.images` is an ordered `jsonb` `ImageRef[]`; the first entry is the card image. Store full URLs, not ones computed at read time.
- **Keys:** `serial` ids are internal. URLs and cross-references in app code use `slug`.
- **Schema changes:** edit `schema.ts`, run `db:generate`, review the SQL, then run `db:migrate`, and commit `./drizzle`. Don't use `db:push`. Keep `seed-data.ts` and `seed.ts` in step with the schema.
- **Writes:** `neon-http` has no interactive transactions. Use `db.batch([...])`, which runs atomically, and resolve foreign keys with slug subqueries rather than returned ids.
- **Reads:** pages read catalogue data only through `src/db/queries.ts`. Every function there is `"use cache"` + `cacheLife` + `cacheTag("products" | "categories")` and returns the `Product`/`Category` types from `src/lib/catalog.ts`. Any future mutation must invalidate those tags (`updateTag`/`revalidateTag`).
- **Client boundary:** client components import catalogue types and helpers from `@/lib/catalog` only, never from `@/db`.
- **Build:** `next build` needs a reachable, seeded database, because `generateStaticParams` reads product slugs and must return at least one.
