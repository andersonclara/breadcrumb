# Event ingestion verification

Checked 2026-10-17T19:18:00.920Z. This is a measured snapshot, not complete campus coverage.

- Hosted Supabase migrations were applied by the user; live imports and anonymous access checks succeeded.
- 633 scheduled listings returned across 4 API pages for the next seven days, including date-only listings. Display deduplication is conservative; these are not a verified census of unique events or proof of current attendance.
- Instagram: 141 distinct posts retained from 30 of the 32 requested profiles. Two completed Apify runs reported $0.3861 combined. No additional paid scrape was launched.
- Instagram processing: {"needs_review":54,"rejected":87}; 110 extracted candidates, 101 dated candidates stored, 3 source-reviewed listings published. 3 malformed model results remain private for review. Undated/ambiguous candidates are not served publicly.
- Provider returned not_found for ufstudentengagement and gatorsvba. Reposts from requested profiles preserve original-author provenance.
- Three published Instagram listings were checked visually against their flyers: C-Lunch, the Elizabeth Bello guest-speaker event, and Florida Cicerones Fall Open House.
- Anonymous staging reads and sync RPC calls returned 401; anonymous review-only event queries returned zero rows. Invalid API parameters returned 400; unauthorized cron returned 401. Public event payloads exposed no raw captions/media/staging payloads.
- The configured Gemini 3.8 model returned 503 during extraction. An explicit Gemini 3.5 Flash-Lite override completed extraction without changing the app-wide model. Model usage is separate from the reported Apify run cost.
- GitHub half-hour scheduling is checked in but not activated remotely. Instagram remains manual. Yik Yak is unconnected. The event API is implemented; event map pins/UI were not changed.

| Source | Latest result | Fetched | Saved/upserted | Review | Error |
| --- | --- | ---: | ---: | ---: | --- |
| arts | succeeded | 11 | 11 | 0 |  |
| bo-diddley | succeeded | 9 | 9 | 0 |  |
| city | succeeded | 10 | 10 | 0 |  |
| florida-museum | succeeded | 10 | 10 | 0 |  |
| gainesville-shows | succeeded | 8 | 8 | 0 |  |
| gainesvilleevents | succeeded | 1027 | 1027 | 256 |  |
| gatorconnect | succeeded | 336 | 336 | 6 |  |
| gatornights | succeeded | 3 | 3 | 0 |  |
| harn | succeeded | 9 | 9 | 9 |  |
| libraries | succeeded | 33 | 33 | 4 |  |
| performing-arts | succeeded | 195 | 195 | 195 |  |
| uf-calendar | succeeded | 215 | 215 | 27 |  |
| visit-gainesville | failed | 0 | 0 | 0 | source_http_404 |

Counts include archive/out-of-window entries and private review records. Repeated syncs upsert records; they do not count as fresh discoveries. See [operation guide](EVENT_INGESTION.md) for commands, source cadence, limits, and deployment setup.

Validation: npm run check and npm run build passed. The workspace check also includes concurrent Ask backend work; those changes are separate from event ingestion. A live model test in that separate suite is opt-in and was skipped by the normal check. No browser/device UI interaction was tested by this ingestion task.
