# Second-pass findings: what Breadcrumb can actually know

Executed October 17, 2026, roughly 12:01–12:19 UTC (08:01–08:19 Gainesville time). **Research only. No application/backend integration, database changes, jobs, AI calls or authenticated social collection.** The preserved Yik Yak experiment was not changed or run. Its earlier success remains user-reported, not newly verified by this pass.

The strongest result is useful scheduled-event coverage without relying on social scraping. Six feeds returned **1,981 rows**, with **1,735 non-cancelled starts in the next 30 days** and **1,693 candidate groups** after conservative duplicate grouping. These are not 1,693 verified unique events. Additional tests found current venue cards, official seasonal activities, careers events and public closure geometry.

[EVIDENCE.md](EVIDENCE.md) records exact URLs, UTC request times, status/format, parsed fields and small factual examples. [evidence/coverage.json](evidence/coverage.json) includes rules and field counts. The previous [first-pass findings](../FINDINGS.md) still cover RecSports, city calendars, Performing Arts, Harn, Visit Gainesville, nightlife and social API requirements. This pass supplements that work rather than repeating every request.

## Summary and decisions

WORKING = relevant real records parsed; PARTIAL = useful facts with substantial gaps; NEEDS ACCESS = credentials/permission needed; BLOCKED = no permitted retrieval completed; NOT YET TESTED = discovery without a conclusive record experiment. These describe retrieval, not publication clearance.

| Source | Status | Method / actual data | Limitations | Next steps |
|---|---|---|---|---|
| GatorConnect | WORKING | Public RSS, 339 events; 335 starts in window; 333 organizer labels | No structured price, tags, reliable modification time or paging established; category/host helps interests | Prefer public syndication; clarify UF display/AI scope; do not require an administrative API key |
| UF Calendar | WORKING | LiveWhale JSON, all 6 reported pages: 568 rows; 565 non-cancelled starts in window | 189 date-only entries, 73 missing locations; cross-listings; no complete campus census | Strong main official discovery source; retain source precision, cancellation and modification metadata |
| UF Calendar search/details | WORKING | Documented gaming search returned GatorLAN; two individual-event JSON records parsed | Individual schema uses Unix seconds, unlike list schema; one multi-day item has no session clock | Use documented filters; preserve all-day status; detail enrichment is feasible |
| UF Libraries | WORKING | Advertised monthly RSS, 33 records, 29 locations, 33 audience fields | RSS lacks timezone; inferred Eastern from calendar UI; monthly subset | Useful workshops/learning interests; validate zone and registration conditions |
| College of the Arts | WORKING | Public Events Calendar REST: 24 window records, all with location/time/cost | Overlaps UF Calendar; category/organizer absent in normalized records | Useful culture/music/exhibition candidates; resolve attribution and duplicate records |
| GainesvilleEvents | WORKING | Public iCal, 1,014 records, 781 starts in window | Aggregated provenance, no structured cost/category; 48h HTTP cache lifetime; some dubious durations | Broad local discovery after publisher/upstream reuse review; do not count copies as corroboration |
| GatorNights | WORKING | Three seasonal HTML cards; one start in window | Inferred campus zone; no end times; free programming description is not food inventory | Keep for signature activities; check eligibility per event |
| Student Engagement homepage | WORKING | 13 Fall 2026 activity cards, 12 locations; date and printed schedule | RSS previously empty; includes past items; multi-day cards do not specify continuous hours | Prefer seasonal cards over empty RSS; link to original for details |
| Gator Market | WORKING | Four Fall 2026 dates; 10AM–3PM, Reitz North Lawn | Two dates already past; vendor fee table is not admission; page inconsistencies need review | Strong pop-up/vendor/festival lead, not proof of free giveaways |
| UF Career Connections | PARTIAL | 10 cards on each of two advertised pages; 10 RSS records | RSS has publication dates only; HTML includes anomalous year-long date range and terse internal titles | Use HTML dates/schedules; validate odd durations, pagination and registration |
| Engineering calendar | PARTIAL | Six HTML previews and seven RSS records | Calendar preview not exhaustive; RSS publication dates not assumed event times; later feed request timed out | Follow advertised details/iCal links on a later manual test; keep old events out of recommendations |
| Engineering robotics iCal | PARTIAL | One genuine event with named timezone/location | Explicitly dated October 16, **2025**, already past | Useful negative control, not upcoming robotics coverage; GatorConnect supplied current robotics candidates |
| Campus Closures | PARTIAL | Official frontend links public ArcGIS polygon/detour query layers; real geometry and status fields parsed | 506/19 total features include archival/saved records; date completeness poor even in published sample | Ask UF for active-state semantics and reuse. Do not label every polygon an active closure or guarantee a safe route |
| UF TAPS | PARTIAL | RSS: ten parking/disruption notices and categories | Publication is not effective date; latest retained example concerns October 9, already past | Parse notices individually before asserting future/active disruptions |
| Heartwood Soundstage | PARTIAL | 63 live show cards; one detail explicitly October 17, 2026, 8PM | Card year missing; ticket inventory not verified; separate old archive still exists | Fetch bounded public detail pages for explicit years; obtain venue syndication scope |
| UF WiCSE calendar | NEEDS ACCESS | Official page/linked JS advertises a public Google Calendar | Public iCal path excluded by robots: content request not sent. Google API credentials/organizer consent not provided | Organizer-supplied permitted feed/export or authorized Calendar API test; no alternate-host workaround |
| HQ shows API | PARTIAL | Documented keyless JSON API responds 200 but returns **zero** Gainesville shows | No demonstrated local event coverage; terms limit competing services | Low priority; clarify whether Breadcrumb's community scope is permitted before broader use |
| GatorLAN / start.gg | NOT YET TESTED | Public page 200, but Event JSON-LD parser found zero records | Homepage/page access does not prove structured retrieval; no approved API experiment | Already covered by official UF pages; investigate official tournament API only if extra fields matter |
| THE FEST / Glory Days | NOT YET TESTED | Public pages accessible; promoter is a legitimate replacement lead for old High Dive links | No relevant event parser confirmed this pass | Timeboxed future public feed/detail or organizer-submission investigation |
| Alachua County Library events page | BLOCKED | `/events` returned 403 | No challenge solving, identity changes or alternate-host retry | Request official feed/export; this does not prove the publisher has no authorized integration |
| NWS weather context | BLOCKED | API docs reviewed; API robots disallows tested point/alert URLs | Content requests not sent; no forecast or alert records retrieved | Clarify authorized API access with publisher before retest; open-data terms alone did not override this experiment's stop rule |
| Yik Yak / Reddit / Instagram / Discord | NEEDS ACCESS | Preserved first-pass experiments and credential guards | No new login, social posts or authorization this pass | Use agreed platform/organizer access paths. No new technical or legal conclusion was inferred from public-page access |

## The questions we actually tested

Snapshot: **2026-10-17T12:14:15.778Z**, Saturday morning in Gainesville. Window: October 17 inclusive through November 16 exclusive. Counts are transparent keyword/date/location candidates, not evaluated chatbot answers. No Gemini or other AI was used to generate them. They exclude known cancellations, but a missing cancellation flag is not proof an event remains scheduled.

| Ask Breadcrumb question | Candidates | What the evidence supports |
|---|---:|---|
| What's happening near Reitz right now? | 0 | No qualifying timed overlap at test instant; not proof nothing is happening |
| Any free food at Turlington? | 0 | No today + Turlington + explicit free/provided-food match |
| Any Women in STEM events this weekend? | 0 | Coverage gap under explicit Women in STEM/WiCSE/expanded Women Engineers rules |
| Any gaming events in 30 days? | 31 | Includes Gator Gaming x Gator Esports GBM; inspect secondary keyword hits |
| Any robotics events in 30 days? | 4 | Includes current Gator Robotics GBMs in Little Hall |
| What's going on tonight? | 23 | Events starting today at/after 5PM with resolvable clocks; geographic quality not validated for every aggregator item |
| What is scheduled at/around Reitz? | 104 | Explicit Reitz/Arredondo location strings, not measured proximity |
| Within walking distance of Reitz? | 118 | Published coordinates within 1km straight-line of an approximate publisher-derived Reitz anchor; not walking routes or time |
| Published free admission? | 191 | Cost explicitly free/no-charge/zero; blank cost remains unknown |
| Food/giveaways/free activities? | 25 | Free/provided-food or prize/giveaway mentions; no guaranteed stock/prize/eligibility |
| Which bars have specials tonight? | 0 | No dated evening drink-special match; recurring offer from first pass not silently treated as tonight's deal |

The rule found **six explicit free/provided-food candidates**, versus **95 food mentions without that evidence**. Two retained facts are FBLS GBMs on October 21 and 28, Heavener Hall Room 260, with the phrase “free pizza.” The script's eligibility-warning detector did not match those descriptions; that is not proof attendance is open to everyone. Details/source links are in the evidence. Restaurant names, “lunch,” “free admission,” and “prizes” are not equivalent to free food for any student walking in.

The Women in STEM zero does not invalidate the product idea. The broad feeds missed a narrow community/weekend slice, while WiCSE publishes a separate calendar we could identify but could not retrieve under current conditions. Organizer-approved calendar exports and club submissions would address that concrete gap. “SWE” alone is intentionally ambiguous because software engineering uses the same acronym.

## Detail, freshness and duplicate findings

**Pagination:** UF Calendar returned 100+100+100+100+100+68 for the requested date window, matching its reported six pages/568 total at execution. Arts returned 24 with no next page. GatorConnect, Libraries and GainesvilleEvents remain publisher-chosen snapshots; no public pagination established. Career page 2 is real and distinct, but only two pages were fetched. Do not project any of these counts onto all UF activities.

**Dates:** All-day/date-only records never become precise “now” instants in the coverage lab. Named timezone conversion detects ambiguous/nonexistent daylight-saving clocks rather than guessing. Libraries and GatorNights explicitly carry an inferred campus-zone label. The query window counts starts, so an ongoing exhibition that began before today can be omitted. Heartwood cards omit years; a detail page supplies one. Engineering's apparently useful robotics search hit is actually 2025. A careers card spans February 2026–January 2027 and needs publisher verification, not silent repair.

**Details:** LiveWhale individual-event JSON uses `date_ts`/`date2_ts`; the generic list parser initially missed these fields. A targeted retest parsed both. Into the Woods is marked all-day/multi-day October 16–25; that is not a claim of nonstop performances. The softball detail specifies October 17 at 6PM Eastern, ending 8PM. The later Engineering RSS detail-discovery request timed out after 25 seconds, despite an earlier successful seven-item retrieval. That is an observed transient request failure, not “Engineering has no feed.” No automatic retries were added.

**Duplicates:** Exact title+instant/day+place grouping found 38 candidate duplicate groups, removing 42 extra rows. Only one of those strict groups spans sources. A looser title+day comparison found **30 cross-source groups**, showing how spelling/room aliases defeat strict matching. For example, UF Viola Day's 09:30-04:00 and 13:30Z agree after conversion. These copies are not independent Loaf corroborations. URL matching found zero cross-source shared-URL/day groups, so its zero clock disagreements does not establish time consistency generally.

**HTTP freshness:** GainesvilleEvents provided ETag/Last-Modified and returned **304** on one conditional request; Cache-Control was `max-age=172800` (48h). That is cache lifetime, not proof of its publishing schedule. UF Calendar returned 200 with an unchanged body while Last-Modified changed: that header alone did not prove event edits. GatorConnect/Libraries supplied no tested conditional validators. Only at most two manual reads per source were made; no poller or schedule was built. [Cache evidence](evidence/cache.json).

**Closures:** Both official layers support Query and pagination (max record count 1,000). Requested only operational ID/type/status/start/end/note/ADA fields and geometry, never editor/user fields or attachments. Parsed five unfiltered features per layer and five `PUBLISHED` features per layer; only one of each five published records had start/end dates. Geometry existed for all sampled published rows. Archived/saved statuses and null dates prevent active-closure guarantees. Retained geometry presence/type/vertex counts, not raw coordinates or free-text notes. [Closure evidence](evidence/closures.json).

## Legitimate access and reuse

Source pages, vendor API docs and request policy were checked separately. Successful reads and minimal research facts do not grant rights to republish descriptions, images, social content or send entire payloads to Gemini. No broad open-content license was established for the UF/venue/aggregator records above. Ask publishers about factual display, attribution/linking, cancellation/deletion updates, retention, images and AI context separately; no publisher was contacted by this work.

- [LiveWhale documents](https://support.livewhale.com/live/blurbs/api) public search/date/category/group/tag parameters and individual-event JSON. It asks for less than one request/second and caching. The research helper now spaces same-origin reads at least 1.1 seconds, also honoring larger crawl delays. No authenticated/hidden records requested.
- [ArcGIS documents](https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer/) Query, selected fields, counts and geometry. The public UF frontend itself links these layers. Empty `copyrightText` is not a reuse license; UF must clarify appropriate use and active-state semantics.
- [Google Calendar lists](https://developers.google.com/workspace/calendar/api/v3/reference/events/list) are a supported API option. The new test requires a Calendar-enabled API key and an affirmative organizer-authorization setting; only its missing-access guard was executed. A publisher-supplied permitted export is another option. It does not bypass the excluded public iCal path.
- [HQ API docs](https://joinhq.app/developers/shows) describe keyless public shows. Its [terms](https://joinhq.app/legal/terms-of-service) license some public event reuse but restrict competing community/event-network uses. Breadcrumb's fit needs clarification; no blanket clearance was assumed, and the local query yielded nothing useful anyway.
- [NWS API docs](https://www.weather.gov/documentation/services-web-api) describe open/free forecast and alert data; its [disclaimer](https://www.weather.gov/disclaimer) requires honest attribution and distinguishes third-party material. However, our API robots check excluded the tested URLs; no weather records were fetched. This report separates documented availability from this execution's stop condition.
- The first-pass [social access requirements](../access/README.md) still apply. Public Discord webhooks cannot read announcements; a permitted bot/calendar export is different. An organizer can supply its own announcement/event facts directly. No platform scraping workaround was tested.

## A first-pass failure caused by our own tool

The helper initially treated all HTML at `/robots.txt` as a denial. Some ordinary SPA sites return the same HTML shell for unknown routes. Diagnostics found normal page titles, no challenge indicators and no parseable directives at WiCSE/Campus Closures/High Dive's redirect. Under [RFC 9309](https://www.rfc-editor.org/info/rfc9309/), parseable rules must still be honored; the absence of groups is not itself a disallow rule.

The corrected helper parses all available directives, stops on detected challenge/denial HTML, and retains conservative stops on unavailable policy, explicit exclusions and 401/403/429. Synthetic offline regression tests verify these distinctions. This unlocked legitimate frontend-linked closure data and the WiCSE calendar lead. It did not override Google/NWS exclusions or the library's 403. Robots interpretation is not content licensing or guaranteed detection of every challenge.

Browser inspection was unavailable in this execution environment: no enabled browser surfaces. Public HTTP, published markup and page-linked static assets were inspected instead. Heartwood's asset mentioned an unrelated public fans/subscriber API; it was deliberately not called. No script bundles were executed, keys extracted, restricted endpoints probed or fan data requested.

## What is worth doing next

The evidence supports a compelling research demo of **scheduled campus discovery + communities/interests + honest live-user confirmation**, without depending on Yik Yak for the core experience. Prioritize GatorConnect, UF Calendar, Libraries/Arts and one licensed local source. Seasonal cards and Heartwood detail pages add distinctive coverage. Closures are promising contextual data once UF explains current-state semantics.

Next research priorities are narrow: organizer-approved Women in STEM calendars, direct merchant/organizer submissions for expiring food/deals, and manual review of the top question candidates. Ticketmaster can be tested with a developer key; approved Discord/Instagram and Reddit remain credential/permission tasks. Yik Yak's original technical success is preserved, but there is no new platform authorization or authenticated experiment here.

See [OPPORTUNITIES.md](OPPORTUNITIES.md) for grounded product ideas and small, measurable follow-up experiments. See [README.md](README.md) for every retest command. No implementation has started.

## Verification executed

- `node research/phase2/verify.mjs`: passed robots fallback/exclusion/challenge handling, daylight-saving/date precision cases, ten minimal evidence files, 49 bounded example facts, coverage arithmetic, selected GIS fields and the missing-Calendar-access guard. Synthetic fixtures are regression checks, never source examples.
- `node research/verify.mjs`: passed syntax for all 27 research scripts, 26 original public sample files, six original missing-access guards and 151 local documentation links at execution.
- `git diff --check`: passed for tracked edits. Only research files were changed; no application test/build was needed or claimed.

Live request results are recorded separately from these offline checks. No new dependency was installed for this pass. Failed/excluded/empty experiments remain visible in evidence rather than being counted as successful event sources.
