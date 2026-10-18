# Event ingestion backend

Imported event listings are stored in the existing Supabase `club_events` table.
They are scheduled publisher announcements, separate from student Crumbs, votes,
and Full Loaves. Importing two copies never creates two independent confirmations.

See the [live verification snapshot](EVENT_INGESTION_VERIFICATION.md) for measured
source coverage, post counts, observed Apify charges, and access checks.

## Connect storage

Apply all missing migrations in order. The event migration is
`supabase/migrations/20261017183922_event_ingestion.sql`, after the initial schema,
pixel world, expanded campus, communities, and custom communities migrations.
Do not rerun a migration already applied. SQL Editor runs do not automatically
create Supabase CLI migration history; reconcile that history before `db push`.

Set these **server-only** variables in the ignored root `.env.local`:

```dotenv
SUPABASE_SERVICE_ROLE_KEY=your-server-key
APIFY_API_TOKEN=your-apify-token
EVENT_SYNC_ENABLED=0
EVENT_SYNC_SOURCES=gatorconnect,uf-calendar,libraries,arts,gatornights
```

Existing public Supabase URL/key settings still apply. Never put these server
credentials in `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`, commits, or chat. The CLI loads
root `.env*` using Next.js environment precedence.

```powershell
npm run events:status
npm run events:preview -- gatorconnect uf-calendar libraries arts
npm run events:sync
```

Preview fetches and parses one page without writing to Supabase or calling AI.
Sync performs bounded pagination (six pages), deduplicated upserts, and private
staging of incomplete records. A source failure is logged without deleting its
previous records; a rerun is safe. `--force` bypasses the refresh cooldown but
never an active job lease. A run with remaining pages is explicitly `partial`.
The importer does not infer cancellation from absence in a partial feed snapshot.
After a complete date-windowed JSON sync, previously stored occurrences missing
from that same window move to review. Expanded LiveWhale sessions retain separate
identities even when the publisher reuses the event ID.

## Sources and refresh frequency

| Source ID | Adapter | Minimum refresh | Default |
| --- | --- | --- | --- |
| `gatorconnect` | Public event RSS | 30 minutes | Enabled |
| `uf-calendar` | LiveWhale JSON, paginated | 30 minutes | Enabled |
| `libraries` | LibCal monthly RSS | 2 hours | Enabled |
| `arts` | Events Calendar JSON, paginated | 2 hours | Enabled |
| `gatornights` | Seasonal HTML cards | 6 hours | Enabled |
| `gainesvilleevents` | Advertised iCal | 48 hours | Opt-in |
| `performing-arts` | Advertised iCal | 6 hours | Opt-in |
| `visit-gainesville` | Events Calendar JSON | 6 hours | Opt-in; timezone review |
| `harn` | Advertised iCal | 6 hours | Opt-in; timezone review |
| `florida-museum` | Event JSON-LD | 6 hours | Opt-in |
| `city`, `bo-diddley` | Official HTML cards | 6 hours | Opt-in |
| `gainesville-shows` | Public HTML cards | 6 hours | Opt-in |

Set `EVENT_SYNC_SOURCES` to choose adapters, or pass source IDs to
`npm run events:sync -- gainesvilleevents`. Additional adapters are based on the
documented research; only a successful current run establishes working retrieval.
Publisher cache lifetimes can make actual refresh slower. Nonpaginated feeds use
ETag/Last-Modified conditional requests. Robots exclusions, challenges, redirects,
authentication failures, and rate limits stop retrieval; there are no bypasses or
automatic retries. Source links and short factual fields are published; full
publisher descriptions and temporary flyer media are not republished.
Bounded publisher descriptions are retained in service-only staging for later
extraction/search work; they are not included in the public events response.

Yik Yak/Sidechat remains an authenticated research experiment, not a scheduled
connector. Reddit, Discord, dining, RecSports, and licensed athletics feeds also
remain unconfigured. `events:status` lists these gaps. Existing public Instagram
accounts are a separate manual import, not a replacement for licensed schedules.

## One-time Instagram collection: 150 total, $5 maximum

All 32 user-specified accounts are in `src/lib/events/sources.ts`.
The first 22 request five posts each; the remaining ten request four each.
This uses two Apify runs with maximum charges of $3.67 and $1.33, totaling $5.
Each request sets `resultsType=posts`, `resultsLimit` per account, `maxItems`,
`maxTotalChargeUsd`, a five-minute timeout, and disables error restarts.
The provider may return fewer results; the importer never buys replacement runs
automatically. Any account-level minimum charge above the configured cap should
fail rather than silently increase the budget.

```powershell
npm run events:instagram -- --plan
npm run events:instagram -- --start
# Resume after the run completes; no duplicate paid run for an existing batch:
npm run events:instagram -- --resume
```

`data/ingestion/instagram-bootstrap.json` is an ignored local checkpoint containing
run IDs and batch status, not credentials or raw captions. An exclusive manifest
and process lock prevent accidental repeat starts. Keep it until the import is
finished. If the process dies after requesting a run but before recording its ID,
the manifest says `starting`: inspect Apify Console and recover that run instead
of blindly starting another. A crash can also leave the local lock; verify the
process has ended before removing that specific lock file.

Exported Apify datasets can be imported without starting a paid run:

```powershell
npm run events:instagram -- --file data/ingestion/posts.json
```

Posts are deduplicated by Instagram ID, sorted locally by publication timestamp,
limited to 150 per import, and restricted to the account watchlist. The importer keeps
collaborations/reposts only when the provider's input URL traces them to a
watchlisted profile; their original author is retained separately for attribution.
Storage keeps
captions, source links, timestamps, pinned status, and bounded media references
privately. Comments, engagement metrics, profiles, and follower lists are omitted.
Unchanged reimports preserve extraction state; changed announcements return to
pending and hide previously extracted listings until reviewed again.

Publication time is **not event time**. A recent post can be a recap; an older
pinned post can announce next week's event. These small per-account samples do
not establish complete coverage of the next seven days.

## Extract and review Instagram event candidates

Extraction is a separate manual Gemini step with no automatic scrape or AI loop.
It uses the existing `GEMINI_API_KEY` and `GEMINI_MODEL` configuration, with an
optional `GEMINI_EVENT_MODEL` override or explicit CLI `--model model-name`. Its model
usage is separate from the $5 **Apify** budget. Default: at most ten pending posts.

```powershell
npm run events:extract -- 10
# Optional multimodal pass; up to two images, 2 MB each, per pending post:
npm run events:extract -- 10 --images
npm run events:review
npm run events:review -- --source instagram
npm run events:review -- event-uuid --approve
```

Posts are processed in batches of up to five per model request, with strict
source-ID matching so facts cannot be attached to another post. Only image hosts
used by Instagram are allowed; redirects are rejected and media
URLs may expire. Caption-only processing does not claim to have read a flyer.
All extracted Instagram listings require manual source review. Missing dates, years,
venues, invalid durations, weekday/date conflicts, and other uncertainties block
approval until corrected. Undated candidates remain in private staging. The
approval command only publishes records whose sole issue is AI review itself.
The review list defaults to the next week (plus yesterday for ongoing items);
use `--all` to include older records.
Non-event posts are marked rejected so reruns do not repeatedly call the model.
Malformed per-post model results are retained privately for review without
discarding valid results from other posts or repeatedly buying the same request.
An extraction lease prevents concurrent batches from paying to process the same
pending posts. Provider failures stop the batch and retain unprocessed posts.

## Read events from web or mobile

`GET /api/events?days=7&limit=100&offset=0` returns published upcoming/in-progress
events with source links, organizer, venue, price, tags, freshness, date-only
precision (`all_day`), and `kind: scheduled`. It never serves private post payloads
or needs-review/cancelled listings. `community_confirmed` is false. The stable
offset cursor is `nextOffset`; display deduplication/filtering can produce fewer
than `limit` results, so use the cursor rather than result count to paginate.
The endpoint supplies data; map pins, geocoding, and a dedicated event UI are
separate work. Unknown venues/coordinates are never placed at invented locations.

Dates are resolved with `America/New_York` where the publisher establishes campus
local time. DST gaps and repeated clocks require review. Date-only storage uses a
midnight boundary but must be displayed as a date, never "starts at midnight."
Unknown end times are not fabricated into a current-activity guarantee. Recurring
iCal masters are quarantined until recurrence expansion is implemented.

## Scheduling

The checked-in GitHub workflow `.github/workflows/events-sync.yml` is scheduled at
minutes 7 and 37, with a repository-variable gate. Enable after the first successful
manual run by setting repository secrets `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`, and repository variable `EVENT_SYNC_ENABLED=1`.
`EVENT_SYNC_SOURCES` is optional. The workflow must be on the default branch for
scheduled runs. GitHub cron is best effort and may run late. The workflow has no
Apify or Gemini key and cannot invoke Instagram or extraction.

Alternatively, a deployed scheduler can call `GET /api/cron/events` with
`Authorization: Bearer <CRON_SECRET>`, a server secret at least 32 characters long,
and `EVENT_SYNC_ENABLED=1` in deployment settings. The route fails closed if the
secret is missing. Database leases protect overlapping instances. Do not claim
the cron is running until the deployed schedule and a successful run are verified.

Supabase `jobs.sql` handles expiry/reminders separately and should run after all
migrations; reminders now exclude cancelled/needs-review/date-only events.

## Validation

`npm run check` covers both apps and the embedded PostgreSQL tests. The database
suite applies all six migrations and tests staging privacy, public event RLS,
sync leases, stale lease tokens, cooldowns, and repeat-import uniqueness. Parser
tests cover namespaced RSS fields, cancellation, pagination, all-day precision,
DST uncertainty, Instagram limits, robots stops, caching, and cron authorization.
`npm run build` verifies the API routes compile. Hosted migration, live data
counts, provider charges, extraction quality, and public reads must be verified
separately against the connected project.

References: [Apify run limits](https://docs.apify.com/api/v2/actors-runs-post),
[Instagram input schema](https://apify.com/apify/instagram-scraper/input-schema),
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).


Reviewed short factual summaries and topic tags are now supported for Instagram events. Raw captions remain private. `npm run events:enrich` plans a bounded enrichment of existing published Instagram listings; `--stage` generates private proposals and `--approve EVENT_UUID` applies reviewed metadata without changing event publication. See [Ask backend](ASK_BACKEND.md#discovery-quality-update-october-18) for the workflow and deployment migration. `/api/events` includes the reviewed `description` field.
