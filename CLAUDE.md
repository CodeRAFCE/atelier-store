# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

eCommerce app in early development. The homepage and product pages read products, categories and per-size stock from Postgres (seeded with Unsplash-image placeholder data, allowed via `images.remotePatterns` in `next.config.ts`). Non-catalogue content (brand, navigation, hero, collections, editorial, footer) is static in `src/lib/site-content.ts`. Email/password auth (sign up/in/out, `/account`, admin-only `/admin`) is in place. A cookie-based shopping bag (`/cart`) supports add, change quantity and remove. Stripe-hosted checkout creates orders (see Checkout). No tests yet.

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
- `npm run auth:set-role -- <email> <customer|admin>` — the only way to grant or revoke admin
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
- **Auth:** `src/lib/auth.ts` (server, Better Auth with the Drizzle `pg` adapter, email/password, 7-day sessions, no cookie cache) is exposed via `src/app/api/auth/[...all]/route.ts`. `src/lib/auth-client.ts` is the React client (sign-in/up/out run client-side). Out of scope until asked: social login, password reset, 2FA, email verification, the Better Auth `admin` plugin.
  - **Roles:** `user.role` is a Better Auth additional field (`"customer"` default, `"admin"`) with `input: false`, so the API can't set it; use `auth:set-role`.
  - **Server checks:** use `getSession` / `requireUser(next)` / `requireAdmin()` from `src/lib/session.ts` (server only). They read headers, so render callers behind `<Suspense>`, and never put them in `"use cache"`. Call them in every protected page (not just a layout), Server Action and Route Handler. Non-admins get `notFound()`.
  - **`src/proxy.ts`** (Next 16's renamed middleware) only redirects on cookie *presence* for `/account`, `/admin`, `/sign-in`, `/sign-up`. It is not an access check.
  - Redirect targets from `?next=` must go through `safeNext()` (`src/lib/auth-redirect.ts`).
  - Better Auth's origin check trusts `BETTER_AUTH_URL` only, so API calls from another port fail with `INVALID_ORIGIN`.

## Cart

- **Persistence:** an httpOnly `cart` cookie holding only `{ slug, size, qty }[]` (parsed by `parseCartCookie` in `src/lib/cart.ts`; read/written by `src/lib/cart-cookie.ts`). No carts table. It works signed out and isn't tied to the user.
- **Server is the source of truth:** names, prices and stock are never taken from the client or the cookie. `src/db/cart.ts` reads them live (deliberately *not* `"use cache"`, unlike `queries.ts`) and computes line totals and the subtotal in integer cents.
- **Mutations** are the Server Actions in `src/app/cart/actions.ts` (`addToCart`, `updateQuantity`, `removeFromCart`). Each validates its arguments, re-reads stock and clamps the quantity to it (max 99 per line, 50 lines). Setting the cookie re-renders the route, so the header count and `/cart` update.
- **Reads** (`getCart`) drop unknown products/sizes, reduce quantities above current stock (`adjusted`) and keep sold-out lines with qty 0, excluded from the subtotal. Nothing reserves or decrements stock; checkout must re-check it atomically.

## Checkout

- **Env:** `STRIPE_SECRET_KEY` (sandbox key) and `STRIPE_WEBHOOK_SECRET` (`stripe listen --forward-to localhost:3000/api/stripe/webhook`). `src/lib/stripe.ts` reads them lazily, and redirect URLs use `BETTER_AUTH_URL`.
- **Start:** `startCheckout` (`src/app/checkout/actions.ts`) takes no arguments. `createPendingOrder` (`src/db/orders.ts`) re-reads price and stock from Postgres, then inserts the order, its item snapshots and the stock decrement in one `db.batch`. The `product_stock` CHECK aborts the batch if stock ran out, so nothing is partly reserved. `src/lib/checkout.ts` then creates the Checkout Session with inline `price_data` from that order snapshot. One pending order per customer; starting again expires the old session first.
- **Paid is only set from Stripe's side:** a signature-verified webhook (`/api/stripe/webhook`) or a server-side `sessions.retrieve` in `/checkout/return`. The `session_id` in the URL only picks which session to look up. `markOrderPaid` also requires the order to be `pending`, the session id to match, and Stripe's amount and currency to equal the stored total. Anything else is flagged `needs_review`, and a payment that arrives after the order was released is refunded.
- **Duplicates and release:** state changes are single SQL statements that also insert the `stripe_events` row, so a replayed event id fails and is acknowledged. `releaseOrder` restocks only if the order really left `pending`. `/checkout/cancel` and `checkout.session.expired` release stock. The bag cookie is cleared only after a verified paid return.
- **Not built yet:** a sweeper for missed `expired` webhooks, emails and fulfilment, tax and shipping rates, and refunds beyond the late-payment case.

## Database conventions

- **Scope:** the schema covers the catalogue (`categories` 1─* `products` 1─* `product_stock`) and Better Auth's tables (`user`, `session`, `account`, `verification` in `src/db/auth-schema.ts`, re-exported from `schema.ts`; text ids, keep in step with the auth config). Checkout tables: `orders` (owned by `user_id`; `status` is our lifecycle, `payment_status` mirrors Stripe, with explicit `stripe_checkout_session_id` / `stripe_payment_intent_id`), `order_items` (price/name/size snapshots plus `product_id` for stock release) and `stripe_events` (webhook dedupe by event id). A partial unique index allows one `pending` order per user, and CHECKs enforce valid statuses, totals and `confirmed` ⇒ `paid`. Money is integer cents. Don't add a carts table (the cart is cookie-based), reviews, wishlists or product variants unless asked.
- **Stock:** one `product_stock` row per size, or a single row with `size = null` for one-size items. A stock row is not a variant (no SKU or price of its own). `quantity >= 0`, and a product's total stock is the sum of its rows.
- **Money:** store integer cents (`price_cents`), never floats. Convert to dollars only in the query mapper.
- **Images:** `products.images` is an ordered `jsonb` `ImageRef[]`; the first entry is the card image. Store full URLs, not ones computed at read time.
- **Keys:** `serial` ids are internal. URLs and cross-references in app code use `slug`.
- **Schema changes:** edit `schema.ts`, run `db:generate`, review the SQL, then run `db:migrate`, and commit `./drizzle`. Don't use `db:push`. Keep `seed-data.ts` and `seed.ts` in step with the schema.
- **Writes:** `neon-http` has no interactive transactions. Use `db.batch([...])`, which runs atomically, and resolve foreign keys with slug subqueries rather than returned ids.
- **Reads:** pages read catalogue data only through `src/db/queries.ts` (the cart's live reads in `src/db/cart.ts` are the one exception). Every function there is `"use cache"` + `cacheLife` + `cacheTag("products" | "categories")` and returns the `Product`/`Category` types from `src/lib/catalog.ts`. Any future mutation must invalidate those tags (`updateTag`/`revalidateTag`).
- **Client boundary:** client components import catalogue types and helpers from `@/lib/catalog` only, never from `@/db`.
- **Build:** `next build` needs a reachable, seeded database, because `generateStaticParams` reads product slugs and must return at least one.
