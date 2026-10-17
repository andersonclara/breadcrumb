# Second research pass: coverage, detail and additional opportunities

Research only. No backend, app, database, scheduled ingestion, or authenticated social collection. First-pass evidence remains in `../samples/`; new evidence goes in `evidence/`. Raw payloads stay in memory. Retain only request metadata, aggregate metrics and bounded event facts; omit contact/editor/attendee data and full descriptions.

Objectives:

1. Test the strongest feeds beyond their first page and compare overlapping records.
2. Measure real question coverage using explicit date/location/interest rules, with no invented answers.
3. Distinguish scheduled events, ambiguous dates, recurring offers and live user observations.
4. Explore organization calendars, official campus disruption feeds and richer local listings.
5. Investigate first-pass failures, including limitations introduced by our own request/parsing code.

All tests use public read-only requests and stop on denial/rate limits. No SMS login or new social-platform authorization is attempted. Original Yik Yak experiment remains unchanged. Current source permission and publication limits continue to apply.

Read [REPORT.md](REPORT.md) for source status/interpretation, [EVIDENCE.md](EVIDENCE.md) for exact requests/fields/counts, and [OPPORTUNITIES.md](OPPORTUNITIES.md) for grounded future experiments. The evaluation date is captured at execution time in America/New_York; a future published event is not evidence it will actually occur or that food remains available.

## Run from the repository root

Uses the existing isolated research dependencies. No new package or application dependency was installed for this pass. Node 24:

```powershell
npm.cmd ci --prefix research --ignore-scripts  # only if research dependencies are absent
node research/phase2/coverage.mjs             # six feeds, max six UF Calendar pages; prints progress/counts
node research/phase2/additional.mjs student-engagement-cards gator-market-dates --compact
node research/phase2/additional.mjs careers-cards careers-page2 --compact
node research/phase2/additional.mjs heartwood-live-cards heartwood-detail --compact
node research/phase2/additional.mjs engineering-current-calendar engineering-robotics-ical --compact
node research/phase2/closures.mjs             # two layers, bounded selected-field samples
node research/phase2/details.mjs --uf-only    # two documented individual JSON detail records
node research/phase2/cache.mjs                # at most two manual GETs per source; no polling
node research/phase2/probe.mjs careers-rss engineering-rss taps-rss --compact
```

Omit `--compact` for full request metadata/missing fields and at most two example records. Add `--save` to these public tests to replace/merge only minimal metadata and sample facts in `evidence/`. Without `--save`, existing evidence stays unchanged. No raw bodies are written. Inspect per-source status/error/count: completion of a script is not proof all its requests worked. Counts/windows will change on retest.

Other independent diagnostics:

```powershell
node research/phase2/explore.mjs wicse closures heartwood --compact  # page discovery, not event proof
node research/phase2/assets.mjs                 # page-linked public asset URLs; never executes bundles
node research/phase2/policy-check.mjs           # three public robots responses; metadata only
node research/phase2/anatomy.mjs gatorconnect heartwood gator-market  # bounded markup/schema diagnostics
node research/phase2/probe.mjs wicse-public-ical gatorlan-jsonld --compact
node research/phase2/context.mjs               # saved publisher-derived anchor; NWS stops + UF gaming search
node research/phase2/details.mjs               # also tries bounded Engineering RSS detail/export discovery
```

`explore.mjs` accepts source IDs listed in its `pages` map. `probe.mjs` and `additional.mjs` accept IDs in their endpoint maps; no IDs selects all. `anatomy.mjs` requires source IDs and is a manual selector/schema aid, not an event collector. It does not retain descriptions/contact values. THE FEST, Glory Days and start.gg are discovery leads; do not report their pages as working data feeds.

The HQ endpoint in `probe.mjs` returned no local shows. Its competing-service terms need clarification; do not broaden that query into a Breadcrumb integration. NWS/public Calendar iCal requests stopped at robots; the scripts do not retry via alternate domains. Library page 403 is preserved as a stop, not a parsing problem.

## Optional Calendar access

The official WiCSE page advertises a public Google Calendar. The public iCal path was excluded and not fetched. A supported API test exists for organizer-approved access; **only the missing-access guard has been run**.

1. Obtain organizer consent for Breadcrumb's intended fields/display and a permitted calendar access method.
2. Enable the Calendar API in a Google Cloud project, create/restrict a suitable API key, and confirm applicable Google policies/quotas. See [Google's setup guide](https://developers.google.com/workspace/calendar/api/quickstart/js) and [events.list reference](https://developers.google.com/workspace/calendar/api/v3/reference/events/list).
3. Put `GOOGLE_CALENDAR_API_KEY` and `PUBLIC_CALENDAR_ORGANIZER_AUTHORIZED=1` in an ignored local env file. The latter records consent; it does not create permission or change server visibility.

```powershell
node --env-file=research/.env.local research/phase2/calendar-access.mjs
```

One bounded request, at most five events/two terminal examples. No saved authenticated payload, cookies, private iCal secrets or automatic retry. A denied API response still stops the experiment. Organizer-supplied permitted calendar exports/submissions are another option. Existing [social/API tests](../access/README.md) remain separate. No Yik Yak SMS login is part of these commands.

## Offline verification and evidence regeneration

```powershell
node research/phase2/report.mjs  # regenerate EVIDENCE.md from saved minimal JSON, no network
node research/phase2/verify.mjs # robots, temporal, privacy, arithmetic and credential guard checks
node research/verify.mjs        # all research script syntax, first-pass samples/guards, local doc links
```

Verification uses clearly labeled synthetic fixtures for robots/DST regressions; they are not presented as returned source records. Reports/evidence do not constitute a license or a production-ready dataset. No benchmark of chatbot accuracy, venue capacity, live inventory or pedestrian routing was performed.
