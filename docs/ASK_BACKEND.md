# Ask Breadcrumb backend

Implemented as a public, read-only `POST /api/ask` endpoint for web and native
clients. No frontend changes are part of this implementation. The route uses
a server-only Groq/Gemini provider, the existing Supabase project, published `club_events`, and
fresh public Campus Crumbs. It does not fetch external sources during chat.

## Setup and deployment

The environment needs `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and an AI
provider. Configure secrets in the existing ignored environment files or
deployment settings; never put them in the request.

Ask prefers **Groq `openai/gpt-oss-120b`** whenever `GROQ_API_KEY` is present.
The model uses strict JSON-schema responses, low reasoning effort, and no
reasoning disclosure. `GROQ_MODEL` is an optional override and must support
strict structured output. No additional SDK is required; requests use the fixed
Groq HTTPS API endpoint. See [Groq structured outputs](https://console.groq.com/docs/structured-outputs).

Set `ASK_AI_PROVIDER=gemini` to explicitly select the original Gemini path,
requiring `GEMINI_API_KEY` and `GEMINI_MODEL`. With no Groq key, Ask also defaults
to that Gemini configuration. An explicitly selected but unconfigured/unknown
provider fails closed. There is no automatic retry or fallback after a request
fails, so latency and usage remain bounded. Provider selection affects Ask only;
event/flyer extraction keeps its own Gemini configuration. No existing ignored
environment files need to be rewritten for the Groq default to take effect.

Reconcile actual hosted migration history first, including any SQL Editor
execution. Then apply only missing migrations in order. Ask's new migration is
`supabase/migrations/20261017185639_ask_backend.sql`, **after**
`20261017183922_event_ingestion.sql` and the original five migrations. It adds
read-only search RPCs, four canonical campus places taken from existing map
anchors (Reitz, Marston, Library West, Century Tower), and a server-only quota
table/RPC. Existing curated places are preserved. The user subsequently applied
this migration through SQL Editor; hosted verification is recorded below.

If using Supabase Dashboard SQL Editor, open the Ask migration file, copy its
entire contents, and run it **once**, after confirming the baseline and ingestion
migrations are already applied. Do not replay the older migrations. SQL Editor
execution does not automatically record CLI migration history; retain the
application record for later reconciliation. No additional migration is needed
to use Groq.

The existing ignored `data/ingestion/apply-pending-migrations.sql` bundle was
compared directly: it contains migrations 002–005 and event ingestion, and does
**not** include Ask or any `ask_*` functions. If that bundle has already been
applied, run only `20261017185639_ask_backend.sql` once. Do not rerun the bundle.

Public calls require no login. Native clients can call the reachable Next.js
origin directly. Browser requests must be same-origin; CORS is not enabled.
Responses always use `Cache-Control: private, no-store`.

Quotas are atomic in PostgreSQL across app instances: six attempts/minute and
60/day per caller bucket, with a global cap of 500/day. Day buckets use UTC.
Rejected attempts can consume daily/global capacity. The service key is used
**only** to charge quota; searches always use a separate anonymous client under
RLS. Missing quota storage fails closed before the AI runs. Old quota buckets
are removed on subsequent requests after two days.

By default, public traffic shares one caller bucket, suitable for local testing.
For a deployed proxy, set server-only `ASK_TRUSTED_IP_HEADER` to a header the
proxy **overwrites** with one validated client IP. Do not trust a header that
the caller can supply or a comma-separated forwarding chain. Unconfigured or
invalid IP headers use the shared bucket. The server HMACs the IP with its
service credential before storage; raw IP addresses are not stored here.

## Frontend integration contract

First request:

```json
{
  "message": "Anything free near Reitz tonight?"
}
```

For follow-ups, send the previous response's `context` unchanged with the new
message. Keep this context in the active chat session. To clear chat, omit it.

```ts
type AskRequest = {
  message: string; // 1–1200 characters; total JSON body <= 16 KiB
  context?: {
    constraints: {
      kind: 'all' | 'events' | 'crumbs';
      time: {
        period: 'now' | 'today' | 'tonight' | 'tomorrow' | 'weekend' | 'next7days' | 'date';
        date: string | null; // YYYY-MM-DD for period=date
      };
      nearPlace: string | null;
      useUserLocation: boolean;
      radiusMeters: number;
      freeOnly: boolean;
      categories: ('event' | 'freebie' | 'crowd' | 'construction' | 'hazard')[];
      terms: string[];
    };
    results: {kind: 'event' | 'crumb'; id: string}[];
    referencePlace: string | null;
  };
  coarseUserLocation?: {latitude: number; longitude: number};
};
```

`coarseUserLocation` is optional, foreground-only and explicitly opted into.
Round to approximately 100 m **on the device before transmission**, using the
shared `roundedLocation` helper. The server rounds defensively again. GPS is
never put in returned conversation context. For follow-ups using "near me", the
client must supply the consented coarse point again; it is not saved by chat.

Success response (all four statuses use HTTP 200):

```ts
type AskResponse = {
  status: 'results' | 'no_results' | 'clarification' | 'unsupported';
  answer: string;
  cards: DiscoveryRecord[]; // at most four, server-sourced facts
  appliedConstraints: Constraints & {
    window: {start: string; end: string}; // UTC ISO; interpreted in America/New_York
    origin: {name: string; aliases: string[]; latitude: number; longitude: number} | null;
  };
  context: AskRequest['context'];
  suggestedFollowUps: string[]; // send a selected suggestion as the next message
  dataFreshnessNote: string;
};
```

The exact runtime schemas and TypeScript definitions live in
`src/lib/ai/ask/schema.ts`. Cards include `kind`, `id`, `title`, `description`,
`category`, `venue`, nullable `latitude`/`longitude`, `startsAt`, `endsAt`,
`eventDate`, `allDay`, `createdAt`, `expiresAt`, `state`, `confirmCount`,
`disputeCount`, `source`, `sourceUrl`, `lastSyncedAt`, `priceText`, `priceType`,
and `distanceMeters`. Nullable fields are always present.

Render answer/title/description as text, not HTML. Source URLs come from
validated retrieved records. Use `(kind,id)` to select a map record; an event
and a Crumb are different record types. Only show map actions when both
coordinates exist. Unresolved venues may appear in unrestricted results with no
pin; they cannot pass a radius restriction. A source label is not a Full Loaf.
`allDay` means date-only/clock unspecified; do not advertise a midnight start.
`priceType=unknown` includes paid and conditional/ambiguous pricing; display
`priceText` as available and never label unknown as free. A freebie Crumb remains
a community claim. `state=full_loaf` means independently corroborated, not proven.

Errors are `{error: string}`: 400 invalid input, 403 cross-origin browser request,
413 body limit, 415 non-JSON, 429 quota (`Retry-After: 60`), or 503 missing
configuration/storage/model availability. Retrieval failures are never disguised
as an empty database.

## Controller and retrieval behavior

The bounded controller makes at most two model calls: structured interpretation
of a minimal constraint patch, then an evidence-only explanation. Place resolution
and event/Crumb search are ordinary validated TypeScript/SQL services. There is no
open-ended agent loop, browsing, arbitrary SQL, or model-driven mutation. The
request has a 25-second model/database deadline and individual model calls have
an 18-second timeout without retries. Records and generated output are bounded.
Gemini 3/4 use low thinking effort for these bounded transformations; other model
families retain their supported defaults.

Follow-ups retain omitted constraints. Explicitly clearing location or resetting
the search is supported. Tonight is 18:00 to local midnight; weekend is the
current/next Saturday–Sunday (remaining Sunday if already Sunday). Exact dates
are supported within the next seven days. Precise custom clock ranges and walking
times require clarification rather than approximation. "Now" requires a known
active interval; date-only events and past starts without an end cannot establish
that an event is currently happening. Live Crumbs cannot support future claims.

Queries enforce publication, lifecycle, time, explicit price evidence, radius,
and text matches before the limit. Known venue names and aliases resolve exactly;
ambiguous requested places are clarified. Terms are OR-matched English full-text
phrases/synonyms across titles, organizer, descriptions and event tags. No
embeddings are generated. Crumb categories do not silently classify scheduled
events. Ranking uses distance, corroboration/disputes, and time, with conservative
grouping of exact duplicate announcements. Search returns up to 20 candidates per
kind; four enter explanation. Counts are not total-campus counts.

No private communities, people sightings, profiles, friend locations, source
staging payloads, or account identifiers are supplied to either AI provider. Even an
authenticated caller receives the public scope. Private-community Ask needs a
separate deliberate authorization design. Sources are treated as untrusted text.

Model citations must match returned record IDs, and model-created hyperlinks are
rejected. Selected records are re-read after generation to recheck moderation,
expiry, access and changed facts. Invalid citations, changed records, or an
explanation failure produce deterministic copy with valid cards. Closest-result
comparisons use database distances and deterministic wording, revalidating prior
IDs. Source-backed prose is still probabilistic; ID validation alone does not
prove every generated sentence. No-result replies preserve constraints and offer
explicit broadening suggestions without performing the broader search silently.

No conversation history, GPS history, embeddings, preference profiles or raw
chat logs are persisted by this code. The selected AI provider receives the current message,
normalized active context, and bounded public result facts. Provider-side API
retention is separate from application storage.

## Verification

```powershell
npm exec -- vitest run tests/ask.test.ts tests/ask-route.test.ts tests/ask-database.test.ts
npm run check
npm run build
```

Optional live checks verify interpretation, follow-up constraints and citations
using three real model requests and explicitly fictional evidence. They do not
write database records:

```powershell
$env:ASK_LIVE_SMOKE='1'
npm exec -- vitest run tests/ask-live.test.ts
Remove-Item Env:ASK_LIVE_SMOKE
```

To verify the real handler against the configured hosted project and model:

```powershell
$env:ASK_HOSTED_SMOKE='1'
npm exec -- vitest run tests/ask-hosted.test.ts
Remove-Item Env:ASK_HOSTED_SMOKE
```

This makes three Ask requests, consumes normal quota/model usage, and reads
public published records. It creates no posts/events and applies no schema changes.

Embedded tests execute real SQL/RLS/quota functions with PostGIS substitutions.
They do not establish hosted PostGIS validity, email delivery, model
availability, or real-device behavior. After applying and verifying the hosted
migration, check a real published event and a fresh Crumb, then a follow-up and
an expired/removed record, through the reachable API. The model-only live tests
do not establish the complete hosted retrieval workflow.

Read-only hosted checks on October 17, 2026 found the event ingestion schema
available but `ask_places` absent (`PGRST202`). The Ask migration has not been
applied by this session; no linked CLI project/database credentials were present
for reconciling hosted migration history. The configured Gemini parser returned
`504 DEADLINE_EXCEEDED` on two live checks (including low thinking effort). A
separate minimal text request also failed to complete. No additional automatic
retries were run. The configured provider/model needs a successful live check
before treating that provider as operational; local contract tests mock providers.

Subsequent Groq checks on October 17, 2026 succeeded using the existing
`GROQ_API_KEY`: the account listed `openai/gpt-oss-120b` as active, and both live
tests passed for intent parsing, preserving free-only follow-up constraints, and
citations against supplied fictional evidence. These checks did not modify
campus data or apply the pending Ask migration.

After the user applied the Ask migration through SQL Editor on October 17, 2026,
hosted checks confirmed `ask_places`, `ask_search_events`, and `ask_search_crumbs`
execute with anonymous credentials. Event search returned 20 bounded candidate
records. Anonymous access to `ask_take_quota` and `ask_quota` was denied (`42501`),
as intended. The real `POST /api/ask` handler then passed the opt-in hosted test:
Groq interpreted an upcoming-event search, cards matched published database IDs
and source URLs, a free-only follow-up preserved the earlier time/type filters,
and an unmatched query returned `no_results`. Service-role quota charging worked
through the handler. The hosted test completed in approximately eight seconds.

The live Crumb search returned no fresh public reports, so a new report becoming
discoverable still needs a real posting test. This verification did not deploy
the Next.js server, connect the frontend, or exercise device/email authentication.
SQL Editor execution is still distinct from recorded CLI migration history.
