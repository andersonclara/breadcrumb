# Breadcrumb mobile

The React Native app targets iPhone and Android using Expo SDK 57 and Expo Router. The Next.js app remains at the repository root for browsers and shared backend routes. Both clients use one Supabase project.

## Start on your phone

From the repository root:

```powershell
npm install
npm run dev:mobile
```

Install Expo Go on iPhone or Android and scan the terminal's QR code. Use the same Wi-Fi network as your computer. Expo Go must support SDK 57; use the matching client from Expo's official setup guide. If Windows asks about network access, you control whether to allow it on your trusted network.

If local Wi-Fi routing fails, `npm run start --workspace=@breadcrumb/mobile -- --tunnel` can use an Expo tunnel. The CLI may request the official tunnel package. A tunnel exposes your development server over an externally reachable URL; use it only when you intend to share that development session.

No EAS account, custom native build, Apple developer membership, or Android Studio installation is required for this Expo Go preview. Actual store releases require separate build/signing configuration and platform developer accounts. iOS local compilation requires macOS; cloud builds can be configured later from Windows.

## Environment

Copy `.env.example` in this directory to `.env.local` and populate:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=your-existing-project-url
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-public-key
EXPO_PUBLIC_API_URL=http://your-computers-LAN-IP:3000
```

During this setup, only the existing public Supabase URL and public key were copied automatically from the web environment into the ignored mobile `.env.local`. Existing mobile environment files are preserved. No Gemini key, database password, cron secret, or Supabase service key belongs in this directory or in an `EXPO_PUBLIC_` variable.

`EXPO_PUBLIC_API_URL` connects posting, avatar saving, friends, and sharing to Next.js. Keep the Next.js server running alongside Expo. In development, the helper replaces a configured localhost hostname with the Metro LAN hostname so phones can reach your computer. Keep the port correct; use an explicit LAN URL when using an Expo tunnel. For a release, use your deployed HTTPS API URL. The cached map and direct Supabase reads/auth do not require that local server.

## Maps

The app now uses a shared pixel-art map built from real UF roads and building footprints, rendered with `react-native-svg` in Expo Go. It matches the browser game's campus world and does not require Apple, Google, or Mapbox API keys. Attribution and a downloadable source snapshot are included. See [the pixel-world guide](../../docs/PIXEL_WORLD.md).

Location permission is requested only when the user chooses to share with friends. Sharing is foreground-only, off by default, and rounded to about 100 meters before upload. Accepted friends see short-lived walking avatar markers; strangers cannot read those positions. Map position can also be selected manually when posting, without GPS. Final bundle/package IDs, store icons, and EAS publishing remain deferred.

## Sign-in

The web uses an emailed magic link. The mobile app uses an emailed numeric code with `signInWithOtp` and `verifyOtp`, so it can sign in inside Expo Go without custom-scheme callbacks.

Before testing, copy the updated root `supabase/templates/magic-link.html` into **both** Supabase Confirm signup and Magic Link templates. It now contains `{{ .Token }}` alongside the existing web link. Enter that code in the mobile app. SMTP is still deferred until the domain is ready, so real UF email delivery remains pending.

Sessions persist in AsyncStorage following Supabase's React Native client pattern. Refreshing follows the app's foreground/background state. Session state on a device is used for presentation; the backend independently verifies the access token, confirmed UF email, and account restrictions for writes. Future routes must call `assertCanAct(request)` to accept native bearer tokens as well as web cookies. Database mutations still belong in guarded server routes with validation and rate limits.

## Included and next work

- Pixel UF campus map with pan/zoom, category filters, breadcrumb placement, confirmation, disputes, and reports.
- Avatar customization, friend codes/requests, and opt-in friends-only avatar locations.
- Explore, Nearby, communities, and a full-height Ask screen. Ask supports public event/report discovery, follow-ups, source details, map actions, cancellation, and retry recovery. Radar remains a placeholder.
- Public `/ask` access from the sign-in screen; guest discovery does not require an account. Signed-in users can open campus map selections, while guests can open public event locations externally.
- UF email-code sign-in, restoration, sign-out, and app-state session refresh.
- Shared category definitions, palette, coordinates, and UF account rules from `@breadcrumb/shared`.
- `src/lib/api.ts` attaches the user's access token to guarded Next.js writes.

Apply `supabase/migrations/20261017000200_pixel_world.sql` once to the existing database to enable these features, preserving the original schema. State refreshes every five seconds. Chat, push notifications, store assets, and signed app binaries remain future work. No mock people or reports are presented as live data.

## Validate

From the repository root:

```powershell
npm run check
npm run build
npm run export --workspace=@breadcrumb/mobile
```

The root lockfile manages all npm workspaces; do not create a second lockfile in this directory. The root web app and mobile app use React 19.2.3 to avoid duplicate React runtimes. Root npm overrides pin the native navigation/animation dependencies to SDK 57-compatible versions. When upgrading Expo, update these pins using Expo's compatibility checks.

Hermes bundle export verifies compilation for both native targets. It does not exercise touch panning, permission prompts, persisted sessions, two-friend interaction, or email delivery; those need real-device checks after SMTP setup. Use [Expo's monorepo guide](https://docs.expo.dev/guides/monorepos/), [SDK 57 SVG guide](https://docs.expo.dev/versions/v57.0.0/sdk/svg/), and [Supabase React Native auth guide](https://supabase.com/docs/guides/auth/quickstarts/react-native) for platform setup.
