# Breadcrumb accounts on web and Expo

Auth0 owns new account passwords when all three server variables `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, and `AUTH0_CLIENT_SECRET` are set. `SUPABASE_SERVICE_ROLE_KEY` is also required. Mobile always uses password signup/login; missing configuration returns a service error instead of switching to email codes. The web form retains its existing email-link fallback when Auth0 is disabled. No Auth0 client secret, service key, or loaf secret belongs in `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variables.

## Auth0 signup and login

Mobile has separate Create account (`/signup`) and Sign in (`/login`) screens. Create account asks for UF email, password, and the bread slice; Sign in asks for email and password. Username/avatar selection happens afterward in profile setup. The existing web form additionally collects a username and password confirmation. The server validates inputs, checks any supplied username, verifies the loaf challenge when enabled, and calls Auth0's database signup and password-realm endpoints. Auth0 password-policy errors appear in the form; the app's 8–128 character validation is only a minimum, not a replacement for Auth0's policy.

After Auth0 authenticates, the server retrieves `/userinfo` using the access token. It requires an `auth0|` subject and the same normalized `@ufl.edu` email that was submitted. It then opens a Supabase session and routes to profile/avatar setup. The database assigns a default username; mobile users can edit it and finish setup there. A username supplied by the web form is saved immediately with `complete_account`.

Mobile email/password login uses the server. The web additionally supports username login through the server-only `login_email_for_username` RPC; email addresses are not exposed to clients by that RPC. Mobile receives Supabase access/refresh tokens and installs them with `setSession`. Web uses SSR cookies. Supabase continues to provide RLS, RPCs, Realtime, session refresh, and sign-out.

**Immediate signup is intentional for this integration:** the user chose to preserve main's behavior without email ownership verification. A typed UF address is accepted, and the bridge administratively confirms the Supabase user so existing guards and database policies work. This confirmation is not evidence that someone owns the inbox. Someone can register another person's unused UF address or create multiple accounts. This must be changed before treating signup as proof of UF identity.

## Existing accounts and password management

The bridge stores the Auth0 subject in server-controlled `app_metadata.auth0_sub`. An existing Supabase user is linked only if already linked to that exact subject, or if the user proves their original Supabase password. An account linked to another subject is rejected. The proof signs out only its temporary session, leaving other devices signed in. On linking, the legacy Supabase password is replaced with a random unused password.

Pre-Auth0 Supabase accounts can still sign in with their original passwords. Fallback occurs only after Auth0 rejects credentials or account linking; provider outages and rate limits do not trigger fallback. An Auth0-linked user is never accepted by this fallback, even if Auth0 is later disabled.

Profile password controls depend on that user's `app_metadata`, not whether Auth0 is globally enabled. Legacy accounts retain their Supabase password editor. Linked accounts offer an email reset through Auth0's `/dbconnections/change_password`; they do not change an unrelated Supabase password. Auth0's password-reset email delivery/template must be configured separately. Responses do not reveal whether an address has an account. Mobile's Forgot password action requests that reset link; mobile signup and login never request verification codes.

## BreadPass

Set `LOAF_SECRET` to enable the loaf-slicing check. Use the same secret in the Auth0 Pre User Registration Action at [`auth0/actions/pre-user-registration.cjs`](../auth0/actions/pre-user-registration.cjs). Deploy the Action and add it to the registration flow; adding the file to this repository does not deploy it.

The signed challenge lasts two minutes. The server validates the trace and issues a five-minute token bound to the normalized email, which the Action validates independently. The Action rejects non-UF addresses and missing/invalid slice tokens. If disabling the slice, adjust the deployed Action too; leaving its check enabled while removing the app secret prevents signup.

The replay cache is per server process, not a distributed single-use guarantee. The gesture and accessible button alternative are a lightweight interaction check, not robust bot protection or identity verification. Keep Auth0 attack protection enabled. Only on Vercel does this implementation forward the trusted client IP; elsewhere Auth0 sees the server IP unless trusted proxy support is added deliberately.

## Mobile and map compatibility

Expo opens account creation first when signed out. The form renders immediately, with the bread challenge loading inline and offering retry if the API is unreachable. It does not fetch signup-mode configuration before rendering or fall back to email codes. Existing users can switch to the separate sign-in screen. The app waits for session restoration before choosing routes; saved sessions open the campus normally. All campus routes require a session, including deep links, and signing out removes them from navigation history. Campus polling and discovery requests pause while signed out. The public web site retains its existing entry flow.

For local Expo development, run `npm run dev` in one terminal and `npm run dev:mobile -- --clear` in another. Expo serves the app bundle; the Next server on port 3000 serves Auth0 requests and bread challenges. The phone must reach that server over the same network. Public auth requests skip Supabase session lookup, so refreshing an old session cannot delay those requests; the bread request times out after eight seconds with an inline retry.

`GET /api/auth/signup` exposes only whether password signup is enabled. `/api/auth/password`, `/api/auth/signup`, `/api/auth/loaf`, and `/api/auth/reset-password` support native requests and the existing localhost Expo web development CORS/preflight allowance. Arbitrary foreign browser origins remain rejected for writes, including localhost origins in production.

Shared loaf helpers are exported from both shared entry points. Keep `login.ts` importing `./email` directly, and keep Expo on `index.mobile.ts`; importing the full web barrel would reintroduce expensive map generators. The tiled Skia renderer, mobile asset generation, and event/Ask functionality remain the integration baseline.

## Setup and verification

Follow [SETUP.md](SETUP.md) for the Auth0 application, enabled database connection, Password grant, and Action configuration. Apply only missing files in `supabase/migrations/` in filename order, including username/account completion migrations. This integration adds no schema migration and does not deploy tenant settings or change hosted data.

Automated tests cover signup validation, provider responses, username login, existing-account takeover rejection, legacy linking, linked-account fallback rejection, session opening, reset requests, loaf validation, and mobile route origin handling. Run `npm run check`, `npm run build`, and an Expo native export with source maps followed by `node scripts/verify-mobile-bundle.mjs <export-directory>`.

Before enabling Auth0 in a deployment, verify with a disposable UF test account: signup and avatar setup, email and username login on web/iOS, legacy-account login and linking, duplicate signup, incorrect password, sign-out/session restore, Auth0 reset delivery, and the deployed Action rejecting direct signup without a slice token. Real tenant credentials are required for this final smoke test; mocked tests cannot verify tenant configuration or email delivery.

API references: [Auth0 Authentication API](https://auth0.com/docs/api/authentication), [Auth0 password resets](https://auth0.com/docs/authenticate/database-connections/password-change), and [Supabase generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink). Enable self-service password changes on the Auth0 database connection for email resets.
