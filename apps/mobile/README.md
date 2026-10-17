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

`EXPO_PUBLIC_API_URL` is for future calls to Next.js API routes. On a physical phone, localhost means the phone itself; use your computer's LAN address and the actual Next.js port. The current native basemap and direct Supabase auth do not require the local Next.js server. For a release, use the deployed HTTPS API URL.

## Maps

The app uses `react-native-maps`, which is bundled in Expo Go. iPhone uses Apple Maps by default; Android uses Google Maps. No location permission is requested by this foundation. The map starts at UF and does not send or store a user's current location. The full browser app continues to use Mapbox.

Expo Go supplies the native map configuration for previews. An Android store/development binary needs your Google Maps API configuration, package ID, and signing restrictions before release. Final iOS bundle ID, Android package ID, app icons, and EAS project configuration are intentionally deferred until publishing is planned.

## Sign-in

The web uses an emailed magic link. The mobile app uses an emailed numeric code with `signInWithOtp` and `verifyOtp`, so it can sign in inside Expo Go without custom-scheme callbacks.

Before testing, copy the updated root `supabase/templates/magic-link.html` into **both** Supabase Confirm signup and Magic Link templates. It now contains `{{ .Token }}` alongside the existing web link. Enter that code in the mobile app. SMTP is still deferred until the domain is ready, so real UF email delivery remains pending.

Sessions persist in AsyncStorage following Supabase's React Native client pattern. Refreshing follows the app's foreground/background state. Session state on a device is used for presentation; the backend independently verifies the access token, confirmed UF email, and account restrictions for writes. Future routes must call `assertCanAct(request)` to accept native bearer tokens as well as web cookies. Database mutations still belong in guarded server routes with validation and rate limits.

## Included and next work

- Native UF basemap and category legend.
- Map, Live Buzz, Ask, and Radar navigation. Buzz, Ask, and Radar are placeholder screens.
- UF email-code sign-in, restoration, sign-out, and app-state session refresh.
- Shared category definitions, palette, coordinates, and UF account rules from `@breadcrumb/shared`.
- `src/lib/api.ts` supplies a fetch helper for future Next.js routes, attaching the user's access token.

Crumb posting, live data subscriptions, feed content, chat, notification permissions, store assets, and signed app binaries are future feature work. No mock reports are presented as live data.

## Validate

From the repository root:

```powershell
npm run check
npm run build
npm run export --workspace=@breadcrumb/mobile
```

The root lockfile manages all npm workspaces; do not create a second lockfile in this directory. The root web app and mobile app use React 19.2.3 to avoid duplicate React runtimes. Root npm overrides pin the native navigation/animation dependencies to SDK 57-compatible versions. When upgrading Expo, update these pins using Expo's compatibility checks.

Hermes bundle export verifies compilation for both native targets. It does not exercise native map rendering, on-device navigation, persisted sessions, or email delivery. Those need real-device checks. Use [Expo's monorepo guide](https://docs.expo.dev/guides/monorepos/), [SDK 57 native maps guide](https://docs.expo.dev/versions/v57.0.0/sdk/map-view/), and [Supabase React Native auth guide](https://supabase.com/docs/guides/auth/quickstarts/react-native) for platform setup.
