# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

eCommerce app in early development. A static homepage exists, driven by placeholder data in `src/lib/sample-data.ts` (Unsplash images, allowed via `images.remotePatterns` in `next.config.ts`). No schemas, auth flows, payments or tests yet.

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

Copy `.env.example` to `.env.local` and set `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET` (`npx @better-auth/cli secret`) and `BETTER_AUTH_URL`. `src/db/index.ts` throws at import if `DATABASE_URL` is missing.

## Architecture

- Next.js App Router with `src/` and the `@/*` → `src/*` alias. Tailwind v4.
- **Next.js version warning:** `AGENTS.md` says this Next.js version has breaking changes from what you may know. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next code.
- **DB:** `src/db/index.ts` exports `db`, Drizzle over Neon's serverless HTTP driver (`drizzle-orm/neon-http`). Tables go in `src/db/schema.ts`, which `drizzle.config.ts` reads. That config loads `.env.local` and then `.env`.
- **Auth:** `src/lib/auth.ts` (server, Better Auth with the Drizzle `pg` adapter, email/password enabled) is exposed via `src/app/api/auth/[...all]/route.ts`. `src/lib/auth-client.ts` is the React client.
- Better Auth's tables are not yet in `schema.ts`. Generate them with `npx @better-auth/cli generate`, add them to the schema, then run the `db:*` migration scripts.
