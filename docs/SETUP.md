# Connect the service accounts

The local scaffold runs without service accounts. Follow these steps together with the assistant when ready. Enter keys directly into `.env.local` or the Vercel dashboard; never paste secret keys into chat.

## 1 Supabase

1. Sign up at https://supabase.com/dashboard and create a project named `breadcrumb`. Choose a region near Florida, such as US East, if offered. Save the database password in your password manager.
2. Once provisioned, copy the project URL and publishable key from the project's Connect dialog into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
3. Copy a server secret key (or legacy service-role key) into `SUPABASE_SERVICE_ROLE_KEY`. This key bypasses RLS and belongs only in server environment variables.
4. On a **fresh project**, run `supabase/migrations/20261017000100_initial_schema.sql`, then `supabase/migrations/20261017000200_pixel_world.sql` in SQL Editor. They create the schema, RLS, account restrictions, moderation, avatars, friendships, and game RPCs. On the existing project, run only the new pixel-world migration once. If you use SQL Editor, it does not record CLI migration history; baseline these migrations before switching to `db push`.
5. In Authentication → URL Configuration, set Site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/confirm`. When deployed, replace Site URL with the production URL and allow its `/auth/confirm` URL too.
6. Enable email sign-in and email confirmations. In **both** Confirm signup and Magic Link email templates, use the contents of `supabase/templates/magic-link.html`. The callback accepts token hashes and PKCE codes, so the login works across devices.
7. Configure a custom SMTP provider before testing with UF student addresses. Supabase's default email service restricts delivery to project team addresses and is unsuitable for a campus demo. Sender verification may require a domain. We can choose the provider together.
8. Restart `npm run dev`, visit `/login`, and request a link for a real `@ufl.edu` inbox. Click it, verify `/profile`, sign out, and sign in again. A non-UF address must be rejected. Check a second browser too.
9. Enable `pg_cron` in Database → Extensions, then run `supabase/jobs.sql` once to schedule expiry and club reminders. Event syncing is deferred until its endpoint and public source exist.

The database rejects non-UF signups even if a caller bypasses the web form. The server write guard additionally requires confirmed email and an active profile. New projects should apply the migration **before** creating test users.

### Optional local Supabase

Docker is required and was not installed as part of this setup. With Docker running:

```powershell
npx supabase@latest start
npx supabase@latest db reset
```

These commands use `supabase/config.toml` and apply the migration. Copy local API details from CLI output to `.env.local`. Local emails appear at `http://localhost:54324`. `db reset` destroys the local database; do not run it against a remote project. Hosted cron extensions are optional and not part of the core migration.

## 1A BreadPass (Auth0) web sign-in

BreadPass replaces the web magic-link form with Auth0's passwordless email code. After Auth0 verifies a `@ufl.edu` address, `/breadpass` creates or reuses the matching Supabase user with the service key and opens a normal Supabase session, so RLS, RPCs, and Realtime keep using `auth.uid()`. Auth0 sends the codes, so web sign-in does not need Supabase SMTP. The mobile app still uses Supabase email codes for now.

1. Create a tenant at https://manage.auth0.com, then Applications → Create Application → **Regular Web Application**.
2. In its Settings, set Allowed Callback URLs to `http://localhost:3000/auth/callback`, and Allowed Logout URLs and Allowed Web Origins to `http://localhost:3000`. Add the production equivalents (for example `https://leaveacrumb.us/auth/callback`) when deployed.
3. Authentication → Passwordless → **Email**: enable it, choose the one-time **code** option, and enable it for this application under its Applications tab. The app requests this connection by its default name, `email`.
4. Optional but recommended: add a post-login Action that denies emails not ending in `@ufl.edu`. The app already rejects them server-side; the Action stops them earlier.
5. Copy Domain, Client ID, and Client Secret into `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, and `AUTH0_CLIENT_SECRET`. Generate `AUTH0_SECRET` with `openssl rand -hex 32` and set `APP_BASE_URL` to the same value as `NEXT_PUBLIC_SITE_URL`. `SUPABASE_SERVICE_ROLE_KEY` must also be set.
6. Restart `npm run dev`, open `/login`, choose **Claim your BreadPass**, and sign in with a UF inbox. A first sign-in lands on `/avatar`. Repeat in a second browser with another UF address, and confirm a non-UF address returns to `/login` with an error.

Leaving any `AUTH0_*` value blank turns BreadPass off and restores the Supabase email-link form.

## 2 Optional Mapbox account

The current game-like map uses a cached OpenStreetMap dataset and does not need a Mapbox token or Google Maps key. An already configured public Mapbox token can remain in `.env.local` for possible future conventional map views; it is not used by the pixel renderer. See [the pixel-world guide](PIXEL_WORLD.md) for data attribution and location-sharing behavior.

## 3 Gemini

Create a project and API key at https://aistudio.google.com. Put the key in `GEMINI_API_KEY` and choose an available model identifier for `GEMINI_MODEL`. No model is hard-coded because availability varies by account. The server-only SDK factory is ready in `src/lib/ai/client.ts`; parsing, chat tools, embeddings, and AI routes are future feature work. Embeddings must use 768 output dimensions to match the initial schema, or use a migration to change the column dimension.

## 4 Vercel

Import the GitHub repository at https://vercel.com/new using the Next.js preset, Node.js 24, and the default build command. Add the same environment variables in the dashboard, with `NEXT_PUBLIC_SITE_URL` set to your deployment's canonical URL. Public environment variables are embedded at build time, so redeploy after changing them. Add the production callback URL and Site URL in Supabase and update Mapbox token restrictions.

Generate `CRON_SECRET` locally when event syncing is implemented. The initial app does not expose a sync endpoint or schedule any external calls. Domain registration, account creation, project provisioning, deployment, and billing choices remain interactive steps with you.

## Verify the connected environment

- The homepage shows the UF basemap without token errors.
- A real UF inbox receives a login link; clicking it opens an active profile.
- Non-UF signup fails through both the app and a direct Supabase signup attempt.
- Anonymous browser sessions can read public crumbs, places, and events but cannot write or read votes, reports, strikes, or another user's profile/inbox.
- Cron jobs appear in Supabase after `jobs.sql` is applied.

Current patterns follow the official [Supabase SSR guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs), [email template guide](https://supabase.com/docs/guides/auth/auth-email-templates), and [Next.js Proxy documentation](https://nextjs.org/docs/app/getting-started/proxy).
