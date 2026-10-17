# Breadcrumb

Leave a crumb. Spread the word.

A community map of what's happening around the University of Florida. This repository contains the base environment: Next.js App Router, TypeScript, Tailwind, a UF Mapbox view, Supabase authentication and database migrations, and a server-only Gemini client.

## Run locally

Use Node.js 24 and npm. In PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. The app runs without credentials, showing a map placeholder and a disabled login form. Add service credentials to `.env.local` and restart the server to enable integrations. No mock campus events are presented as live data.

## Included

- Responsive foundation page using the outline's bread palette and category definitions.
- Mapbox map centered on UF when a public token is present.
- UF-only magic-link sign-in, callback, authenticated profile, sign-out, cookie refresh, and a reusable server write guard that fails closed.
- Supabase browser, server, and service clients; service credentials and Gemini stay server-only.
- Initial SQL migration for places, profiles, crumbs, votes, reports, strikes, events, subscriptions, notifications, and sync logs. It includes RLS, category lifespans, three-confirmation Full Loaves, moderation, and Realtime publication entries.
- Optional cron SQL for expiry and event reminders; CLI configuration and email templates for local Supabase.
- UI dependencies and shadcn aliases ready for feature work, plus CI checks.

Posting routes, feed, chatbot, Radar UI, live map subscriptions, rate limits for future API writes, event scraping, place/event seeds, flyer scanning, and deployment are still feature work. Notification tables and basic fan-out exist; quiet hours, per-hour caps, and user settings are not implemented. Do not expose future service-key write endpoints without validation, rate limiting, and the account guard.

## Connect accounts

Follow [the setup walkthrough](docs/SETUP.md), beginning with a fresh Supabase project. No external accounts or projects have been created, and the migration has not been applied to a hosted database.

## Check the environment

```powershell
npm run check
npm run build
npm start
```

`check` runs ESLint, TypeScript, UF account-rule tests, and embedded PostgreSQL tests for constraints, RLS, Loaf transitions, moderation, suspension, bans, and notifications. The database tests substitute PostGIS/pgvector types and omit Realtime publication setup because embedded PostgreSQL lacks those hosted extensions. They verify the actual PL/pgSQL business logic, but do not replace a full migration and login test on Supabase. The health endpoint is `/api/health`; it checks the app process, not external service connectivity.

## Project layout

```text
src/app/                 Pages, server actions, auth callback, health route
src/components/          Map and login UI
src/lib/auth/            Pure account rules
src/lib/supabase/        Browser, session, and privileged server clients
src/lib/ai/              Server-only Gemini factory
src/lib/guard.ts         Confirmed UF account and suspension checks
src/proxy.ts             Supabase session refresh
supabase/migrations/     Versioned database schema
supabase/jobs.sql        Optional hosted cron jobs
supabase/templates/      Magic-link email template
tests/                   Account and embedded database tests
docs/SETUP.md            Account and deployment walkthrough
```

Keep `.env.local` out of git. All teammates should apply schema changes through new migrations. Do not copy keys into source, screenshots, or chat.

## Validation limits

The production build, lint, TypeScript checks, all 21 tests, and local HTTP smoke checks passed during setup. Browser automation was unavailable, so visual browser QA remains pending. Full PostGIS, pgvector, Realtime, email delivery, and cross-device sign-in must be checked after connecting Supabase and Mapbox.

The production dependency audit reported no vulnerabilities. The full audit reported five high-severity advisories in the development-only ESLint dependency chain, rooted in [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm); the registry's latest release was still affected. Keep linting limited to trusted repository files and update when a compatible fix is available. No forced framework downgrade was applied.
