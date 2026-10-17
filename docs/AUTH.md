# Breadcrumb sign-in and profile onboarding

The login page includes the bread logo, an email-or-Breadcrumb-username field, a password field, and a Create Account tab. Account creation asks only for an @ufl.edu address. An email link (web) or code (mobile) verifies ownership. Newly verified users go directly to Profile editing to choose a username, set a Breadcrumb password, and customize an avatar together. Saving finishes onboarding and opens the campus map. Existing verified accounts return to the map after password sign-in.

The initial username is the GatorLink part of the UF email. Users can change it from Profile. Usernames are case-insensitive and unique, with 3?30 letters, numbers, dots, underscores, or hyphens. Passwords are managed only by Supabase Auth. The profile setup form requires 8?128 characters and matching confirmation. It does not store passwords in application tables.

Avatar customization uses previous/next arrows for each option, with wrapping and row swipe gestures on web and mobile. The same editor is available after onboarding.

## Auth0 accounts (no email)

When `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, and `AUTH0_CLIENT_SECRET` are set, Auth0 owns Breadcrumb passwords and no email is sent:

- **Create Account** (web and mobile) asks for a @ufl.edu email, a username, and a password. The server creates the Auth0 user (`/dbconnections/signup`), signs in with Auth0's password-realm grant, opens the matching Supabase session (`src/lib/auth/bridge.ts`), and saves the username with `complete_account`. Profile setup then shows the username and avatar only.
- **Log in** accepts the email or the Breadcrumb username. Usernames resolve to the email on the server, and Auth0 checks the password. Mobile logs in through `/api/auth/password` and signs up through `/api/auth/signup`.
- Supabase still provides sessions, RLS, RPCs, and Realtime. Each Supabase user gets a random, unused password so `complete_account` works, and stores its Auth0 ID in `app_metadata.auth0_sub`.

**BreadPass slice:** to create an account, the student drags a knife through a pixel loaf at a server-chosen spot (`src/components/loaf-slicer.tsx`; mobile `apps/mobile/src/components/loaf-slicer.tsx`). The server checks the signed, single-use, 2-minute challenge and the drag (full cut, near the mark, human timing, not a perfectly uniform line) in `src/lib/auth/loaf.ts`. It then sends Auth0 a 5-minute slice token bound to the email. The Pre User Registration Action (`auth0/actions/pre-user-registration.cjs`) re-verifies that token with the shared `LOAF_SECRET`, so sign-ups that skip the app are denied, and it records `human_check: loaf_slice` in user metadata. This stops casual scripts, not a determined bot that fakes drag paths; Cloudflare Turnstile could be added behind it.

**Known limitations (hackathon):** nobody proves they own the @ufl.edu address they type, so one person can create many accounts, use someone else's address, or stack confirmations. Fix later with email verification from a verified sender domain, or UF Microsoft sign-in. Password change and reset are not built yet, because Auth0 resets need email.

Leave the `AUTH0_*` values blank to keep the Supabase email sign-up described above.

## Required setup

Apply pending migrations in order through 20261017000600_username_accounts.sql. Migration 006 assigns default usernames, adds the account completion flag, enforces username uniqueness, and provides a server-only username lookup. Hosted migrations have not been applied in this coding session.

Email/password login uses the public Supabase client. Username/password login resolves the private email on the Next.js server, then verifies the password with Supabase Auth. It requires SUPABASE_SERVICE_ROLE_KEY in the root .env.local (a Supabase secret key or legacy service_role key). The user deferred this setting; the UI instructs users to use their UF email until it is configured. Never copy this key to mobile or NEXT_PUBLIC variables.

Verification emails still depend on the previously deferred email/SMTP setup. Keep email confirmations enabled, configure the web site URL and /auth/confirm redirect in Supabase, and use the existing confirmation template containing both the verification code and token-hash link.

Tests cover username normalization, password validation, first-time routing, UF confirmation, editable default usernames, duplicate rejection, and denial of email lookup to anonymous and authenticated browser roles.
