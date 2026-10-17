# Breadcrumb

Leave a crumb. Spread the word.

A community map of what's happening around the University of Florida, presented as an 8-bit campus world. Next.js powers the web app; React Native and Expo power iPhone and Android. Both render the same pixel map, avatar outfits, breadcrumbs, and loaves using one Supabase backend.

## Run locally

Use Node.js 24 and npm. In PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

```powershell
npm install
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```

Open http://localhost:3000 (or the alternate port printed by Next.js). The pixel campus map renders without credentials. Add Supabase configuration and apply both migrations to connect saved avatars, friends, location sharing, and live posts. No mock people or campus events are presented as live data. Preserve an existing `.env.local`; only copy the example for a new setup.

## Run on iPhone and Android

```powershell
npm run dev:mobile
```

Install Expo Go on your phone and scan the QR code from the terminal while connected to the same Wi-Fi. The native app lives in `apps/mobile`, using Expo SDK 57. It has the pixel campus world, four navigation tabs, saved avatars, friends, foreground location sharing, breadcrumbs, and UF email-code sign-in. Ask and Radar remain placeholders. Next.js must also be running for native writes.

See [the mobile setup guide](apps/mobile/README.md) for environment configuration, phone networking, and email-code setup. Mobile has its own ignored `.env.local` containing only public settings. The web `.env.local` stays at the repository root. Never copy server secrets into the mobile app.

## Included

- Responsive 8-bit interface with a cached, georeferenced OpenStreetMap campus world and layered player/bread sprites.
- Avatar creator with skin, hair, clothing, and accessory options persisted to the user's profile.
- Accepted-friend requests and opt-in, foreground-only location sharing, rounded to about 100 meters and expiring after 90 seconds.
- Breadcrumb placement, validation, disputes, reports, a live feed, related-post suggestions, and deduplicated three-confirmation Full Loaves.
- UF-only web magic-link sign-in and native email-code sign-in, sign-out, session persistence, and a reusable server write guard accepting web cookies or mobile bearer tokens.
- Supabase browser, server, and service clients; service credentials and Gemini stay server-only.
- Initial SQL migration for places, profiles, crumbs, votes, reports, strikes, events, subscriptions, notifications, and sync logs. It includes RLS, category lifespans, three-confirmation Full Loaves, moderation, and Realtime publication entries.
- Optional cron SQL for expiry and event reminders; CLI configuration and email templates for local Supabase.
- UI dependencies and shadcn aliases ready for web feature work, native Expo Router tabs, and CI checks for both platforms.
- `@breadcrumb/shared` supplies map data, sprites, outfit validation, categories, coordinates, and account rules. `@breadcrumb/client` supplies the shared campus polling hook.

Chatbot, Radar settings, push notifications, event importing, flyer scanning, and deployment remain feature work. Campus state refreshes every five seconds. New game writes use a guarded API and transactionally rate-limited auth-scoped SQL functions; they do not require a service-role key. See [the pixel-world guide](docs/PIXEL_WORLD.md) for the exact privacy, grouping, and rollout rules.

## Connect accounts

Follow [the setup walkthrough](docs/SETUP.md) for a new environment. The existing Breadcrumb Supabase project is shared by both clients; do not create a second database or rerun the initial migration for mobile. SMTP/domain setup and deployment remain deferred. The email template now also includes `{{ .Token }}` for mobile sign-in; update both hosted templates before testing native authentication.

Apply **`supabase/migrations/20261017000200_pixel_world.sql`** once to the existing database to enable the new features. Until it is applied, the map/outfit preview render and the client displays a setup message instead of fake live state.

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
packages/client/         Shared web/native campus state hook
supabase/migrations/     Versioned database schema
supabase/jobs.sql        Optional hosted cron jobs
supabase/templates/      Magic-link email template
tests/                   Account and embedded database tests
docs/SETUP.md            Account and deployment walkthrough
```

Keep `.env.local` out of git. All teammates should apply schema changes through new migrations. Do not copy keys into source, screenshots, or chat.

## Validation limits

The expanded test suite includes 38 checks for avatars, friends-only location access, expiry, rate limits, grouping, moderation, and authentication. Embedded database tests substitute PostGIS, so hosted migration verification is still required. The pixel-map and sprite artwork was rendered and visually inspected; browser and phone interaction tests remain pending. SMTP is still required for real UF email delivery. See the pixel-world guide for the current verification details, including unrelated research-script lint warnings.

The workspace dependency audit reports unresolved advisories in the Expo/React Native toolchain and the existing ESLint dependency chain. Some suggested fixes require incompatible SDK/framework downgrades, so no forced upgrade or downgrade was applied. Review compatible patches before releasing app binaries. The dependency tree remains pinned to the SDK's expected native versions.
