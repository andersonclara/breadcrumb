# Connect the service accounts

The local scaffold runs without service accounts. Follow these steps together with the assistant when ready. Enter keys directly into `.env.local` or the Vercel dashboard; never paste secret keys into chat.

## 1 Supabase

1. Sign up at https://supabase.com/dashboard and create a project named `breadcrumb`. Choose a region near Florida, such as US East, if offered. Save the database password in your password manager.
2. Once provisioned, copy the project URL and publishable key from the project's Connect dialog into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
3. Copy a server secret key (or legacy service-role key) into `SUPABASE_SERVICE_ROLE_KEY`. This key bypasses RLS and belongs only in server environment variables.
4. On a **fresh project**, apply files in `supabase/migrations/` in filename order, starting with the initial schema. On an existing project, apply only missing migrations. The pixel-world, campus expansion, communities, custom communities, and event-ingestion migrations extend the original schema; see [event ingestion](EVENT_INGESTION.md). If you use SQL Editor, it does not record CLI migration history; baseline applied migrations before switching to `db push`.
5. In Authentication → URL Configuration, set Site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/confirm`. When deployed, replace Site URL with the production URL and allow its `/auth/confirm` URL too.
6. Enable email sign-in and email confirmations. In **both** Confirm signup and Magic Link email templates, use the contents of `supabase/templates/magic-link.html`. The callback accepts token hashes and PKCE codes, so the login works across devices.
7. Configure a custom SMTP provider before testing with UF student addresses. Supabase's default email service restricts delivery to project team addresses and is unsuitable for a campus demo. Sender verification may require a domain. We can choose the provider together.
8. Restart `npm run dev`, visit `/login`, and request a link for a real `@ufl.edu` inbox. Click it, verify `/profile`, sign out, and sign in again. A non-UF address must be rejected. Check a second browser too.
9. Enable `pg_cron` in Database → Extensions, then run `supabase/jobs.sql` after all migrations to schedule expiry and club reminders. Public-feed syncing has its own protected endpoint and optional GitHub schedule; see [event ingestion](EVENT_INGESTION.md). Instagram collection is manual and excluded from scheduled jobs.

The database rejects non-UF signups even if a caller bypasses the web form. The server write guard additionally requires Supabase email confirmation and an active profile. In Auth0 immediate-signup mode the bridge sets that confirmation administratively; it does not prove inbox ownership (see [AUTH.md](AUTH.md)). New projects should apply the migration **before** creating test users.

### Optional local Supabase

Docker is required and was not installed as part of this setup. With Docker running:

```powershell
npx supabase@latest start
npx supabase@latest db reset
```

These commands use `supabase/config.toml` and apply the migration. Copy local API details from CLI output to `.env.local`. Local emails appear at `http://localhost:54324`. `db reset` destroys the local database; do not run it against a remote project. Hosted cron extensions are optional and not part of the core migration.

## 1A Auth0 username/password accounts

Auth0 holds Breadcrumb passwords; the pixel login form talks to Auth0 from the server. See [AUTH.md](AUTH.md) for the flow and the no-verification limitation.

1. In Auth0, create a **Regular Web Application** (or reuse one). Copy its Domain, Client ID, and Client Secret into `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, and `AUTH0_CLIENT_SECRET` in `.env.local`. `SUPABASE_SERVICE_ROLE_KEY` is also required.
2. Open Application → Settings → Advanced → **Grant Types**, enable **Password**, and save. Set **Token Endpoint Authentication Method** to **Post** because the server sends the client credentials in the JSON body. On the same Settings page, turn on **Trust Token Endpoint IP Header**, so brute-force protection uses each student's IP on Vercel.
3. Open Application → **Connections** and enable **Username-Password-Authentication**. If using a different connection name, set `AUTH0_DB_CONNECTION` to match.
4. Open Authentication → Database → Username-Password-Authentication. Leave **Disable Sign Ups** off and **Requires Username** off; usernames live in Breadcrumb. Keep an appropriate Auth0 password-strength policy with a minimum length of 8. The app displays Auth0 policy errors; its 8-128 character check is only a baseline.
5. Open Branding → Email Templates → **Verification Email** and turn it off, so Auth0 does not send mail that UF filters.
6. Generate the BreadPass slice secret with `openssl rand -hex 32` and put it in `LOAF_SECRET` in `.env.local` (and Vercel).
7. Open Actions → Library → Build Custom → **Pre User Registration** (Node 22 runtime). Paste the contents of [`auth0/actions/pre-user-registration.cjs`](../auth0/actions/pre-user-registration.cjs). Under the Action's **Secrets**, add `LOAF_SECRET` with the **same value**. Deploy it and add it to the Pre User Registration flow. The Action allows only @ufl.edu addresses and rejects any sign-up without a valid loaf-slice token, including direct calls to Auth0's public signup endpoint.
8. Configure Auth0 password-reset email delivery and its reset template. Immediate signup does not send a verification email, but the profile password-reset action requires mail delivery.
9. Restart `npm run dev` and Expo. On `/login`, Create Account should show email, username, password, confirm, and the loaf to slice. Test web and iOS using the checklist in [AUTH.md](AUTH.md); repository tests do not validate deployed tenant settings.

Leave `LOAF_SECRET` blank to turn the slice off. In that case, also use an Action without the slice check, or every sign-up will be denied.

## 2 Optional Mapbox account

The current game-like map uses a cached OpenStreetMap dataset and does not need a Mapbox token or Google Maps key. An already configured public Mapbox token can remain in `.env.local` for possible future conventional map views; it is not used by the pixel renderer. See [the pixel-world guide](PIXEL_WORLD.md) for data attribution and location-sharing behavior.

## 3 Gemini

Create a project and API key at https://aistudio.google.com. Put the key in `GEMINI_API_KEY` and choose an available model identifier for `GEMINI_MODEL`. Manual event/flyer extraction can use `GEMINI_EVENT_MODEL` as a separate override; see [event ingestion](EVENT_INGESTION.md). Embeddings remain unimplemented and would need 768 output dimensions to match the initial schema, or a migration to change the column dimension.

Ask Breadcrumb prefers Groq `openai/gpt-oss-120b` when `GROQ_API_KEY` is present. `GROQ_MODEL` optionally overrides it, and `ASK_AI_PROVIDER=gemini` explicitly selects Gemini instead. Keep all AI keys server-only. Apply the Ask migration after event ingestion, only if it is missing, and see [the Ask backend guide](ASK_BACKEND.md) for the API contract and live verification.

## 4 Vercel

Import the GitHub repository at https://vercel.com/new using the Next.js preset, Node.js 24, and the default build command. Add the same environment variables in the dashboard, with `NEXT_PUBLIC_SITE_URL` set to your deployment's canonical URL. Public environment variables are embedded at build time, so redeploy after changing them. Add the production callback URL and Site URL in Supabase and update Mapbox token restrictions.

Configure a server-only `CRON_SECRET` of at least 32 characters before enabling the protected event-sync endpoint. The optional GitHub scheduler remains gated by repository configuration; Instagram collection stays manual. See [event ingestion](EVENT_INGESTION.md) before activating any schedule. Domain registration, account creation, project provisioning, deployment, and billing choices remain interactive steps with you.

## Verify the connected environment

- The homepage shows the UF basemap without token errors.
- A real UF inbox receives a login link; clicking it opens an active profile.
- Non-UF signup fails through both the app and a direct Supabase signup attempt.
- Anonymous browser sessions can read public crumbs, places, and events but cannot write or read votes, reports, strikes, or another user's profile/inbox.
- Cron jobs appear in Supabase after `jobs.sql` is applied.

Current patterns follow the official [Supabase SSR guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs), [email template guide](https://supabase.com/docs/guides/auth/auth-email-templates), and [Next.js Proxy documentation](https://nextjs.org/docs/app/getting-started/proxy).
