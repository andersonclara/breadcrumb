# Breadcrumb

Leave a crumb. Spread the word.

A community map of what's happening around the University of Florida. The web app uses Next.js, TypeScript, Tailwind, and Mapbox. The iPhone and Android app uses React Native, Expo, and native Apple/Google maps. Both share the same Supabase backend and a small TypeScript package of app rules.

## Run locally

Use Node.js 24 and npm. In PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000 (or the alternate port printed by Next.js). Without credentials, the web app shows a map placeholder and disabled login form. Add service credentials to `.env.local` and restart the server to enable integrations. No mock campus events are presented as live data.

## Run on iPhone and Android

```powershell
npm run dev:mobile
```

Install Expo Go on your phone and scan the QR code from the terminal while connected to the same Wi-Fi. The native app lives in `apps/mobile`, using Expo SDK 57 for Expo Go compatibility. It has a native UF map, four navigation tabs, and UF email-code sign-in with persistent sessions. Buzz, Ask, and Radar are clearly marked placeholders.

See [the mobile setup guide](apps/mobile/README.md) for environment configuration, phone networking, and email-code setup. Mobile has its own ignored `.env.local` containing only public settings. The web `.env.local` stays at the repository root. Never copy server secrets into the mobile app.

## Included

- Responsive foundation page using the outline's bread palette and category definitions.
- Mapbox map centered on UF when a public token is present.
- UF-only web magic-link sign-in and native email-code sign-in, sign-out, session persistence, and a reusable server write guard accepting web cookies or mobile bearer tokens.
- Supabase browser, server, and service clients; service credentials and Gemini stay server-only.
- Initial SQL migration for places, profiles, crumbs, votes, reports, strikes, events, subscriptions, notifications, and sync logs. It includes RLS, category lifespans, three-confirmation Full Loaves, moderation, and Realtime publication entries.
- Optional cron SQL for expiry and event reminders; CLI configuration and email templates for local Supabase.
- UI dependencies and shadcn aliases ready for web feature work, native Expo Router tabs, and CI checks for both platforms.
- `@breadcrumb/shared` supplies categories, palette, UF map coordinates, account rules, and the three-confirmation threshold. It contains no React or server dependencies.

Posting routes, feed, chatbot, Radar UI, live map subscriptions, rate limits for future API writes, event scraping, place/event seeds, flyer scanning, and deployment are still feature work. Notification tables and basic fan-out exist; quiet hours, per-hour caps, and user settings are not implemented. Do not expose future service-key write endpoints without validation, rate limiting, and the account guard.

## Connect accounts

Follow [the setup walkthrough](docs/SETUP.md) for a new environment. The existing Breadcrumb Supabase project is shared by both clients; do not create a second database or rerun the initial migration for mobile. SMTP/domain setup and deployment remain deferred. The email template now also includes `{{ .Token }}` for mobile sign-in; update both hosted templates before testing native authentication.

## Check the environment

```powershell
npm run check
npm run build
npm run export --workspace=@breadcrumb/mobile
npm start
```

`check` runs ESLint and TypeScript for web and mobile, shared UF account-rule tests, cookie/bearer authentication guard tests, and embedded PostgreSQL tests for constraints, RLS, Loaf transitions, moderation, suspension, bans, and notifications. The database tests substitute PostGIS/pgvector types and omit Realtime publication setup because embedded PostgreSQL lacks those hosted extensions. They verify the actual PL/pgSQL business logic, but do not replace a full migration and login test on Supabase. Mobile export compiles iOS and Android JavaScript into Hermes bundles; it does not build or submit app-store binaries. The health endpoint is `/api/health`; it checks the app process, not external service connectivity.

## Project layout

```text
src/app/                 Pages, server actions, auth callback, health route
src/components/          Map and login UI
src/lib/auth/            Pure account rules
src/lib/supabase/        Browser, session, and privileged server clients
src/lib/ai/              Server-only Gemini factory
src/lib/guard.ts         Confirmed UF account and suspension checks
src/proxy.ts             Supabase session refresh
apps/mobile/             React Native + Expo app for iPhone and Android
packages/shared/         Platform-independent domain rules and constants
supabase/migrations/     Versioned database schema
supabase/jobs.sql        Optional hosted cron jobs
supabase/templates/      Magic-link email template
tests/                   Account and embedded database tests
docs/SETUP.md            Account and deployment walkthrough
```

Keep `.env.local` out of git. All teammates should apply schema changes through new migrations. Do not copy keys into source, screenshots, or chat.

## Validation limits

The web production build, lint and TypeScript checks for both apps, and all 28 tests passed during mobile setup. iOS and Android Hermes bundles were also exported. Browser/device automation was unavailable, so visual QA and real-device native map checks remain pending. Email delivery and cross-device sign-in depend on completing SMTP setup.

The workspace dependency audit reports unresolved advisories in the Expo/React Native toolchain and the existing ESLint dependency chain. Some suggested fixes require incompatible SDK/framework downgrades, so no forced upgrade or downgrade was applied. Review compatible patches before releasing app binaries. The dependency tree remains pinned to the SDK's expected native versions.
