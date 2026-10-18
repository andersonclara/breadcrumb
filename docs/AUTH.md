# Breadcrumb sign-in and profile onboarding

The login page includes the bread logo, an email-or-Breadcrumb-username field, a password field, and a Create Account tab. Account creation asks only for an @ufl.edu address. An email link (web) or code (mobile) verifies ownership. Newly verified users go directly to Profile editing to choose a username, set a Breadcrumb password, and customize an avatar together. Saving finishes onboarding and opens the campus map. Existing verified accounts return to the map after password sign-in.

The initial username is the GatorLink part of the UF email. Users can change it from Profile. Usernames are case-insensitive and unique, with 3?30 letters, numbers, dots, underscores, or hyphens. Passwords are managed only by Supabase Auth. The profile setup form requires 8?128 characters and matching confirmation. It does not store passwords in application tables.

Avatar customization uses previous/next arrows for each option, with wrapping and row swipe gestures on web and mobile. The same editor is available after onboarding.

## Required setup

Apply pending migrations in order through 20261017000600_username_accounts.sql. Migration 006 assigns default usernames, adds the account completion flag, enforces username uniqueness, and provides a server-only username lookup. Hosted migrations have not been applied in this coding session.

Email/password login uses the public Supabase client. Username/password login resolves the private email on the Next.js server, then verifies the password with Supabase Auth. It requires SUPABASE_SERVICE_ROLE_KEY in the root .env.local (a Supabase secret key or legacy service_role key). The user deferred this setting; the UI instructs users to use their UF email until it is configured. Never copy this key to mobile or NEXT_PUBLIC variables.

Verification emails still depend on the previously deferred email/SMTP setup. Keep email confirmations enabled, configure the web site URL and /auth/confirm redirect in Supabase, and use the existing confirmation template containing both the verification code and token-hash link.

Tests cover username normalization, password validation, first-time routing, UF confirmation, editable default usernames, duplicate rejection, and denial of email lookup to anonymous and authenticated browser roles.
