# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

Initial scaffold for an eCommerce app. Only wiring exists: no schemas, UI, auth flows, payments or tests yet.

## Commands

- `npm run dev` / `npm run build` / `npm start` — Next.js
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- `npm run typecheck` — `tsc --noEmit`
- `npm run db:generate` / `db:migrate` / `db:push` / `db:studio` — drizzle-kit (migrations output to `./drizzle`)
- No test runner is configured.

## Setup

Copy `.env.example` to `.env.local` and set `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET` (`npx @better-auth/cli secret`) and `BETTER_AUTH_URL`. `src/db/index.ts` throws at import if `DATABASE_URL` is missing.

## Architecture

- Next.js App Router with `src/` and the `@/*` → `src/*` alias. Tailwind v4.
- **Next.js version warning:** `AGENTS.md` says this Next.js version has breaking changes from what you may know. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next code.
- **DB:** `src/db/index.ts` exports `db`, Drizzle over Neon's serverless HTTP driver (`drizzle-orm/neon-http`). Tables go in `src/db/schema.ts`, which `drizzle.config.ts` reads. That config loads `.env.local` and then `.env`.
- **Auth:** `src/lib/auth.ts` (server, Better Auth with the Drizzle `pg` adapter, email/password enabled) is exposed via `src/app/api/auth/[...all]/route.ts`. `src/lib/auth-client.ts` is the React client.
- Better Auth's tables are not yet in `schema.ts`. Generate them with `npx @better-auth/cli generate`, add them to the schema, then run the `db:*` migration scripts.
