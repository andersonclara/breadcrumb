# BreadPass — Auth0 Identity & Calendar Integration Plan

> **Project:** Breadcrumb · SwampHacks XII · University of Florida  
> **Status:** Proposed implementation plan (not yet implemented)  
> **Updated:** October 17, 2026  
> **Owner:** Breadcrumb team  
> **Tagline:** *Leave a crumb. Spread the word.*

## TL;DR / Decisions

**BreadPass** is Breadcrumb's privacy-first campus identity: **verified privately, anonymous publicly**. Auth0 handles sign-in and account authentication; Breadcrumb handles anonymous display, moderation, and the separate Loaf corroboration system.

| Decision | Plan |
| --- | --- |
| Can visitors browse? | **Yes**, no sign-in for public map, events, Live Buzz, or basic Ask Breadcrumb. |
| Who can post/confirm/dispute for MVP? | **Accounts with verified `@ufl.edu` email addresses only.** |
| Login method | **Passwordless email one-time code (OTP)** via Auth0 Universal Login. No password required. |
| What happens at first sign-in? | Provision **one** persistent BreadPass identity with an internal account ID and optional anonymous display alias. |
| Are posts linked to real names? | **No public real name, email, or Auth0 user ID.** Backend retains private account linkage for abuse prevention. |
| Does every Crumb require Face ID? | **No.** A valid BreadPass session is sufficient. |
| Passkeys / Face ID? | **Optional stretch goal** for fast future login; not a dependency of posting. |
| Non-UF posting? | **Not in the hackathon MVP.** Public browsing remains open. Revisit contributor tiers later. |
| Calendar-aware Ask Breadcrumb? | **Opt-in stretch feature** using Auth0 connected accounts / Token Vault and Google Calendar free/busy permission. |
| Existing database | Keep **Supabase PostgreSQL, PostGIS, Realtime**, but explicitly adapt identity references if moving from Supabase Auth. |

### Product rationale

Breadcrumb needs spontaneous, comfortable, anonymous-feeling posting *and* the ability to prevent one authenticated account from confirming the same Crumb repeatedly. BreadPass reconciles those goals. **Authentication verifies control of a university email; it does not establish that a report is true or that an account uniquely represents one human.** A Full Loaf means independently corroborated *accounts*, not authoritative verification.

---

## 1. Core experience

### A. Browse without signing in

Visitors can open the UF map, inspect community Crumbs and official events, filter by category/interests/communities, and ask public campus-discovery questions. Browsing should not trigger a login wall.

### B. First contribution: “Claim your BreadPass”

1. User taps **Drop a Crumb**, **I see this**, **Dispute**, or another contribution action.
2. If unauthenticated, show a small branded explanation: **“Claim your BreadPass — verify your UF email to contribute anonymously.”**
3. User enters their `@ufl.edu` address in **Auth0 Universal Login**.
4. Auth0 sends an **email one-time code**; user enters it. No password is created.
5. The server checks the authenticated identity's **verified email** and allowed domain **on every protected request**, not merely on the form.
6. If eligible, create or retrieve a **persistent BreadPass profile** keyed privately to the Auth0 subject (`sub`). Never create a new identity for each post.
7. Show **“BreadPass unlocked 🍞”** and continue the action the student originally tried to perform.
8. Future contributions use the active authenticated session. Request fresh authentication only if there is a genuine security need (e.g., account recovery or an unusually sensitive operation).

**Do not use a custom, self-built OTP system.** Auth0 owns code issuance/validation and authentication sessions; Breadcrumb provides branded copy/UI around the flow.

### C. Anonymous posting and corroboration

- All ordinary posts are presented as **anonymous community reports**. Optional randomly generated handles must not reveal email or account identity; default can be no visible stable author identifier at all.
- Each Crumb stores a **private `profile_id`** for moderation/limits, inaccessible from public APIs.
- A user may have **one active vote per Crumb** and **cannot confirm their own Crumb**. Enforce this in the backend/database, not only the UI.
- Bans, strikes, rate limits, and author resolution are account-scoped. The user cannot evade them by changing a public alias.
- Report details can say **“Reported by a UF-email-verified account.”** Do **not** equate this with a verified claim.
- Loaf states remain separate: **Crumb → Rising → Full Loaf → Stale/Toast**. The Loaf System is about **corroboration**, not identity.
- Prevent abuse through existing moderation/reporting flow; avoid automatically striking an author solely due to easily brigaded disputes without review in a production version.

### D. Non-UF access — deferred

**MVP:** Anyone can view public information, but **only UF-email-verified accounts may contribute and vote**. This reduces spam/complexity for one-campus launch.

**Future:** Consider distinct, explicitly labeled account types such as **UF contributor**, **approved event organizer**, and **local business**. Design their write permissions and trust indicators independently. Never silently treat external business promotion as an eyewitness confirmation.

---

## 2. Recommended implementation scope

### P0 — Hackathon requirement: BreadPass identity

- [ ] Create Auth0 tenant and a Regular Web Application for the existing Next.js app.
- [ ] Configure Universal Login with **email OTP passwordless connection**.
- [ ] Configure callback/logout URLs for localhost and the production domain `leaveacrumb.us`.
- [ ] Implement login/logout/session handling with the **current `@auth0/nextjs-auth0` SDK**, following docs for the installed SDK version (avoid copying older v3 route examples into v4 projects).
- [ ] Restrict *contributions* to a **verified `@ufl.edu` address** server-side; do not restrict anonymous browsing.
- [ ] Provision/reuse one internal BreadPass profile on first eligible login.
- [ ] Hide email, `sub`, and internal identity link from public event/Crumb responses.
- [ ] Update post/vote/report routes to enforce session, campus eligibility, suspension/ban status, and rate limits.
- [ ] Reconcile Supabase schema/RLS with Auth0 identities before turning on direct authenticated database queries.
- [ ] Test two separate UF identities and one anonymous browser session end-to-end.

**Definition of done:** A logged-out visitor can explore. An eligible UF account can create a Crumb and confirm someone else's report, but cannot confirm their own or confirm twice. Public viewers cannot discover the reporter's email or internal identity from API responses.

### P1 — Auth0 feature that advances Ask Breadcrumb: Calendar-Aware Ask

- [ ] Let a signed-in BreadPass user optionally select **Connect Google Calendar** from Ask Breadcrumb settings.
- [ ] Use an **explicit separate consent flow**, not automatic connection during UF email login.
- [ ] Investigate and configure **Auth0 Connected Accounts for Token Vault** for delegated Google API access. Confirm feature availability and SDK behavior in our tenant.
- [ ] Request the **minimum necessary Google Calendar permission**, ideally `https://www.googleapis.com/auth/calendar.freebusy` (or supported equivalent).
- [ ] Retrieve a **short requested time window of busy blocks** server-side; do not fetch or store private event titles/descriptions for the MVP.
- [ ] Convert busy intervals into available time windows; intersect with candidate Breadcrumb events by time, geography, interests, and cost.
- [ ] Return source-linked recommendations. A user who declines calendar access still gets regular Ask Breadcrumb.
- [ ] Provide **Disconnect calendar** and clear connected-state status; honor revocation.

**Definition of done:** “I have a free hour tomorrow and want something tech-related” returns event suggestions using **the user's consented availability**, not invented schedule details. Disconnecting removes that capability, and no private calendar event details appear in LLM prompts, logs, or public results.

### P2 — Optional polish / future

- [ ] Passkey enrollment (Face ID / Touch ID / Android biometrics / device PIN depending on OS), if supported in the configured Auth0 connection/tenant.
- [ ] Optional fresh WebAuthn challenge for unusually sensitive actions—not for every Crumb.
- [ ] More detailed privacy controls for public pseudonyms.
- [ ] Granular roles for verified organizations and businesses.
- [ ] Read-only calendar import beyond free/busy **only if** users request and explicitly authorize it.
- [ ] Private collaborative “Campus Crews” and permission-controlled activity plans (separate feature, not prerequisite).

**Feasibility note:** Auth0 documents a convenient combined email-OTP + progressive passkey enrollment flow for **passwordless database connections**, but the feature is **Early Access**. Standard email passwordless works separately; do not make passkeys a hackathon blocker.

---

## 3. Architecture and identity mapping

```text
                     Public visitor
                          |
        Public map / Live Buzz / public Ask Breadcrumb
                          |
   Contribution attempted |  (login only now)
                          v
          Auth0 Universal Login (email OTP)
                          |
                Verified @ufl.edu?
                      /       \
                    No         Yes
                    |           |
              View only     Auth0 session
                                |
                      Next.js protected API
                      authorization + limits
                                |
                   Private BreadPass profile
                     (Auth0 sub -> UUID)
                                |
                  Supabase PostgreSQL + PostGIS
                   Crumbs / votes / strikes
                                |
                    Anonymous public output

Optional separate connection:
   User consent -> Auth0 Token Vault -> Google Calendar free/busy
                    -> Ask Breadcrumb event planner
```

### Critical existing-schema issue

The earlier Breadcrumb schema used `profiles.id UUID REFERENCES auth.users` (Supabase Auth) with other tables referencing `profiles.id`. **Auth0's user `sub` values are generally provider-prefixed strings, not Supabase UUIDs.** Do not insert an Auth0 `sub` into a UUID column or assume `auth.uid()` will represent the Auth0 identity.

**Preferred conceptual adjustment:**

```sql
-- Illustration: adapt existing tables via a migration, not blind copy/paste.
-- Ensure existing FK constraints to auth.users are removed/reworked safely.
create table breadpass_profiles (
  id uuid primary key default gen_random_uuid(),
  auth0_sub text not null unique,
  public_alias text,
  campus text not null default 'uf',
  suspended_until timestamptz,
  banned boolean not null default false,
  created_at timestamptz not null default now()
);
```

For a new project, `crumbs.user_id`, `votes.user_id`, `crumb_reports.user_id`, and `strikes.user_id` can reference **the internal profile UUID** instead of `auth.users`. For an existing database, **write a real migration** that preserves current profiles and foreign keys—don't run the illustration directly on production.

**Implementation options:**

1. **Simplest MVP:** Keep all protected writes behind Next.js API routes. Verify Auth0 session + verified UF email + internal profile + bans/rate limits on the server, then use a server-only Supabase service credential for a narrowly scoped database operation. Never expose the service role key. Public reads remain under restrictive RLS. Authenticated private reads (e.g., Radar inbox) can also pass through authenticated server routes initially.
2. **Later / if needed:** Configure Supabase **Third-party Auth → Auth0** to validate Auth0 JWTs for direct client-side Supabase reads and Realtime. Supabase's Auth0 guide requires a `role: 'authenticated'` claim on an **Auth0 ID token** and describes passing it to the Supabase client. RLS must authorize against the right Auth0 identity claim (for example, `auth.jwt()->>'sub'`) mapped to the internal profile, rather than blindly relying on `auth.uid()`. **Test thoroughly** before adopting.

Review how the current Supabase Realtime policies and notifications table work with the chosen option; a successful backend login **does not automatically mean** all existing Supabase-authenticated subscriptions or RLS rules continue working.

### Example account-eligibility logic (pseudocode)

```ts
const session = await getVerifiedAuth0Session();
const email = session.user.email?.trim().toLowerCase();
if (!session.user.email_verified || !email?.endsWith('@ufl.edu')) {
  throw new ForbiddenError('UF-verified BreadPass required');
}
const profile = await findOrCreateBreadPassProfile(session.user.sub);
if (profile.banned || isCurrentlySuspended(profile)) throw new ForbiddenError();
// Authorize action; enforce per-account uniqueness + rate limiting in DB.
```

Treat this as **illustrative pseudocode**, not paste-ready Auth0 SDK code. Validate session integrity via the supported SDK; never trust user IDs/email supplied in request bodies or local storage. If email change is supported, recheck eligibility when authorization is performed. A UF email proves control of that inbox, **not** active student enrollment or unique personhood.

---

## 4. Google Calendar + Ask Breadcrumb: product details

### Example interaction

> **Student:** “I have classes tomorrow, but want to find something fun and free between them.”  
> **Breadcrumb:** “Want me to check your calendar availability? I'll only look at busy times.”  
> **Student:** “Connect calendar” → Google permission screen → approves.  
> **Breadcrumb:** Retrieves free/busy blocks and finds matching public event records, then presents 2–3 recommendations with source cards and links to map pins.

### Data and authorization boundaries

- BreadPass's UF email OTP and the **Google Calendar connection are different flows**. Students may verify `@ufl.edu` and connect a *different* Google account later with explicit consent.
- Confirm Auth0 **Connected Accounts / Token Vault** correctly associates the delegated Google connection with the existing BreadPass identity. Avoid creating or automatically merging a second sign-in identity when connecting Google. If account linking is required, follow Auth0's verified linking flows.
- Prefer the Google Calendar **FreeBusy API** (`POST /calendar/v3/freeBusy`) and narrow free/busy scopes over broad calendar read/write permissions.
- Keep Google credentials and delegated tokens out of browser JavaScript and Gemini prompts. The server obtains availability through the authorized mechanism and gives Gemini only the time windows needed for planning.
- Don't store long-lived calendars, event names, contacts, or participant details for this feature.
- Avoid inferring personal schedule reasons from busy periods. Present available times only.
- Calendar disconnect/revocation must cause future connected requests to fail closed, with a clear UI message.
- Use `America/New_York` and proper timezone conversions when comparing UF events with calendar intervals.
- Google OAuth consent-screen testing, allowed test users, verification, and enterprise domain policies can block testing. Provide a manual time-slot fallback for the demo.

### Proposed internal tools (NOT required endpoints yet)

```ts
getCalendarAvailability({ start, end, timeZone })
searchCampusEvents({ start, end, tags, location, maxPrice })
recommendCampusPlans({ availableWindows, candidateEvents, walkingPreferences })
```

Auth0 controls **delegated access**, while Gemini synthesizes **recommendations** from the returned, permission-scoped structured information. Gemini should never invent a scheduled event, a person's location, or their availability.

---

## 5. UI copy and branding

**Product name:** BreadPass  
**One-line promise:** *Your campus. Your identity. Your privacy.*  
**Login CTA:** “Claim your BreadPass”  
**Email step:** “Enter your UF email. We'll send a one-time code—no password needed.”  
**Success:** “BreadPass unlocked 🍞 You're part of the community.”  
**Contribution CTA:** “Drop a Crumb” (do **not** prompt Face ID every time)  
**Community report attribution:** “Anonymous · UF email verified” when space allows  
**Calendar CTA:** “Connect my calendar (optional)”  
**Calendar privacy description:** “Only check when you're busy so we can suggest events that fit.”

**Important:** Do not market BreadPass as zero-knowledge, untraceable, proof of student enrollment, or a guarantee of truthful reports. Breadcrumb staff/backend can link reports to accounts for authorized moderation; be clear in privacy wording.

---

## 6. Security and privacy checklist

- [ ] Email code flow is handled by Auth0; throttle OTP attempts and avoid email-enumeration leaks.
- [ ] Validate ID/session claims on the server: issuer/audience as appropriate via SDK, verified email, and allowed domain.
- [ ] Store Auth0 secrets and Supabase service role key **server-side only** (`.env.local`, deployment secret store); do not log OTP codes or tokens.
- [ ] Hide email, Auth0 `sub`, IP/geolocation metadata, and private account link from public API payloads.
- [ ] Use distinct internal profile IDs for FK relationships; avoid public stable handles across sensitive sightings.
- [ ] Apply unique `(crumb_id, profile_id)` vote constraints and self-vote restrictions atomically.
- [ ] Rate-limit Crumbs, votes, reports, and login-adjacent flows; reject suspended/banned accounts.
- [ ] Review RLS against Auth0 JWT claim format and Realtime notification access; test users cannot read another user's private records.
- [ ] Restrict sightings that identify or track private individuals; moderation and privacy protections remain necessary even for UF accounts.
- [ ] Account recovery and loss of `@ufl.edu` access need a defined policy; don't assume email verification lasts forever.
- [ ] Calendar read access must be genuinely optional, time-bounded, and revocable; no event titles or private descriptions sent to the model.
- [ ] Ensure the app offers source labels: official event vs unverified Crumb vs community-corroborated Full Loaf.

---

## 7. Suggested test plan

| Test | Expected outcome |
| --- | --- |
| Signed-out visitor opens map | Public map/events/Buzz work with no login. |
| Visitor taps Drop a Crumb | Sent to branded BreadPass email OTP flow. |
| Valid `@ufl.edu` OTP | Authenticated session; persistent internal BreadPass profile created/reused. |
| Different/non-verified email | Cannot perform write actions; can still browse public content. |
| Same user signs in twice | Same internal profile; no duplicate passports. |
| User posts | Crumb appears without public name/email/Auth0 subject. |
| User attempts self-confirmation | Rejected server-side. |
| User confirms twice | Only one active vote recorded. |
| Suspended user tries post | Rejected even with active login session. |
| Two browsers logged in as different users | Real-time Crumbs and Loaf states update correctly. |
| One user accesses another user's Radar | Unauthorized; private notifications stay private. |
| User declines calendar | Ask works from public campus data. |
| User connects calendar | Consent obtained; only busy windows used to recommend events. |
| User revokes calendar access | Calendar-aware answer unavailable; normal Ask still works. |

For the demo, explicitly mark staged reports and confirmations as *demo scenarios*.

---

## 8. Hackathon execution order / stop rules

1. **First:** Don't disrupt the map, Crumb submission, Loaf votes, and real-time sync. Identity is a dependency, not an excuse to redo the entire backend.
2. **Next:** Get one UF BreadPass login working, then a second user, then anonymous browsing.
3. **Next:** Test the migrated Supabase identity mapping and RLS/Realtime on two phones.
4. **Then:** Polish the BreadPass welcome card and transparent privacy messaging.
5. **Only if P0 is green:** Prototype Google Calendar free/busy with Token Vault in isolation; include a consent/disconnect path.
6. **Only if integration succeeds:** Wire availability windows to Gemini's existing event search/recommendation path.
7. **Skip if time is running out:** Passkeys, attendance QR codes, group permissions, non-UF writer roles, production Google verification workflows.

**Decision gate:** If Auth0 + Supabase migration threatens core posting/voting, timebox the issue and either isolate Auth0 in a functional prototype or defer the swap. Don't ship two partially working identity systems.

### Three-minute sponsor story

> “Students want to post freely, but trustworthy crowd reports need accountability. BreadPass uses Auth0 to verify UF email ownership while keeping every contribution publicly anonymous. A persistent private identity prevents repeated votes and supports moderation; our separate Loaf System tracks community corroboration. We're also exploring Auth0 Token Vault to let students opt into calendar-aware, privacy-respecting AI event planning—without exposing their schedules to the public or to the model.”

### Live demo sequence

1. Browse Breadcrumb without logging in.
2. Try to post and **claim a BreadPass with UF email OTP**.
3. Show successful entry into the anonymous posting experience.
4. Post a demo Crumb, confirm from separate UF test accounts, show Loaf state changing.
5. Show that the public report contains **no real identity** and a duplicate vote is blocked.
6. **If built:** Opt into calendar connection; ask Gemini for activities during a free window and show linked, sourced recommendations.

---

## 9. Implementation references (verified research starting points)

- [Auth0 — Passwordless email OTP tutorial](https://developer.auth0.com/resources/labs/authentication/passwordless-with-email)
- [Auth0 — Next.js integration resources / SDK](https://developer.auth0.com/resources/get-started/web-app/nextjs)
- [Auth0 — Passwordless database connections / progressive passkeys (Early Access)](https://auth0.com/docs/authenticate/database-connections/passwordless-authentication-for-db-connect)
- [Supabase — Auth0 third-party authentication integration](https://supabase.com/docs/guides/auth/third-party/auth0)
- [Supabase — Third-party Auth architecture and limitations](https://supabase.com/docs/guides/auth/third-party/overview)
- [Auth0 for AI Agents — Connected Account integrations](https://auth0.com/ai/docs/intro/integrations)
- [Auth0 — Token Vault and secure delegated access](https://auth0.com/blog/auth0-token-vault-secure-token-exchange-for-ai-agents/)
- [Google Calendar — Choose minimal OAuth scopes](https://developers.google.com/workspace/calendar/api/auth)
- [Google Calendar — FreeBusy API](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query)

> These are design references. Verify actual tenant feature availability, SDK versions, pricing, quotas, scopes, and Google OAuth consent requirements before implementation. This file is a plan, not evidence that the features are deployed.
