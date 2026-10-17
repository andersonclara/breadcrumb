# Breadcrumb external data findings

## Nightlife and flyer update — October 17, 2026

See the [nightlife report](nightlife/REPORT.md), [timestamped evidence](nightlife/EVIDENCE.md) and [retest commands](nightlife/README.md). Public website/feed experiments parsed **28 Gainesville promoter listings**, two dated First Magnitude event details plus food-truck cards, two Loosey's event details, seven undated Salty Dog weekday offers, and Swamp Head REST/iCal records (20/27; overlapping methods, not 47 unique events).

Three actual publisher-linked flyers were processed locally with Windows OCR and OpenCV across 11 variants, then visually reviewed. Contrast recovered one missed date; another crop returned an incorrect clock and small-print conditions remained missing. Flyer extraction is technically viable with explicit uncertainty/review. These were **website images, not Instagram downloads**. No full images/transcripts, authenticated responses, app integration or paid vision calls were added. [Manual comparison](nightlife/evidence/manual-review.json) records the observed successes and errors. Source reuse/AI rights remain source-specific.

## Morning second-pass update — October 17, 2026

The later [coverage and exploration report](phase2/REPORT.md) supersedes first-pass limitations where stated. Its six-feed snapshot returned **1,981 rows**, **1,735 non-cancelled starts in 30 days**, and **1,693 candidate groups**, not verified unique events. It confirmed gaming/robotics/free-admission candidates and exposed gaps in live availability, Women in STEM weekend coverage and dated bar specials. [Exact second-pass evidence](phase2/EVIDENCE.md) and [retest commands](phase2/README.md) are separate; original samples below remain historical evidence.

| Source / question | Updated status | What changed | Limit / next step |
|---|---|---|---|
| UF Calendar | WORKING | All six reported pages in the requested window fetched; documented search/details parsed | Respect all-day precision and cross-listings; not a campus census |
| Student Engagement / Gator Market | WORKING | 13 seasonal activity cards and four market dates parsed | Earlier empty RSS did not mean no events; past dates/vendor fees need careful interpretation |
| Campus Closures | PARTIAL | Official frontend-linked ArcGIS layers returned geometry/status records | Earlier robots HTML stop came from our helper; published records still have missing dates, current activity unconfirmed |
| Heartwood | PARTIAL | 63 live cards plus a detail with explicit 2026 date | Earlier parser only saw 2025 archive; card years still require details |
| Careers / Engineering / TAPS | PARTIAL | Real cards or RSS notices retrieved | Date anomalies, archived events and publication/effective dates need review; later Engineering request timed out |
| WiCSE | NEEDS ACCESS | Public calendar identified | iCal robots exclusion honored; organizer/API route prepared but not credential-tested |
| Live food / bar-special answers | PARTIAL | Six explicit free/provided-food candidates, no dated bar-special match tonight | Published mention is not current stock or open eligibility; user/organizer confirmation remains central |

See [product research opportunities](phase2/OPPORTUNITIES.md). No application/backend, database, scheduled task or authenticated social experiment was added. Yik Yak remains preserved and was not newly executed.

## First-pass snapshot (historical; see update above)

Investigated **2026-10-17 UTC**, starting 03:24 UTC (evening of October 16 in Gainesville). Research only; no application, database, frontend, authentication integration, ingestion pipeline or job was changed.

**The strongest technical candidates are GatorConnect public feeds and UF Calendar's LiveWhale JSON API.** Libraries, Arts, GatorNights and local calendars add useful coverage. Technical success does not establish a license to redistribute descriptions/images or supply content to Gemini.

## Evidence and status definitions

[RESULTS.md](RESULTS.md) lists **26 executed public parsing experiments** with exact endpoints, UTC request times, HTTP statuses, formats, counts, field coverage and pagination metadata, plus **31 homepage discovery requests**. [samples/](samples/) retains metadata and at most two small factual examples per experiment, not raw responses. No response was fabricated. Homepage success never establishes working event retrieval.

**WORKING** means useful real information parsed; **PARTIAL** means useful information with substantial limitations; **NEEDS ACCESS** means missing credentials/authorization; **BLOCKED** means no currently available permitted method found for the tested use; **NOT YET TESTED** means no conclusive record-retrieval experiment. Transport or client-rendering failures do not prove a source lacks an API.

Discovery considered official APIs, advertised RSS/iCal, public structured records/JSON-LD, then bounded HTML reads. Working publisher feeds were preferred to undocumented internal endpoints. “Not found” means this timeboxed investigation did not establish a method, not that none exists. No access controls, TLS verification, challenges or rate limits were bypassed. No identities/user agents were rotated.

## Summary

| Source | Status | Method | Data retrieved | Limitations | Next steps |
|---|---|---|---|---|---|
| GatorConnect / Anthology Engage | WORKING | Public RSS/iCal | 340 events per feed; start/end, location, category; RSS host | Public events only; no structured price/coordinates; windowed snapshot | UF approval for syndication/AI scope; prefer feeds over admin keys |
| UF Calendar | WORKING | LiveWhale JSON, RSS, iCal | JSON 1,000; paginated test 5 of reported 1,231; iCal 875 | Cross-listings, recurrence, format limits, incomplete fields | Confirm UF reuse scope; prefer paginated JSON |
| UF Student Engagement | PARTIAL | Public page and RSS; GatorNights child page | RSS parsed but **0 items**; child page has 3 events | General RSS is not a useful event feed | Use departmental calendars/GatorNights/GatorConnect |
| GatorNights | WORKING | Public HTML cards | 3 Fall 2026 events with clocks/Reitz locations | One past event; no end times or per-event IDs | Confirm reuse and seasonal maintenance; preserve enrollment eligibility |
| UF RecSports | NOT YET TESTED | Page/policy discovery attempted | No records parsed | Node TLS chain verification fails; system CA option did not fix it; web retrieval also failed | Ask for feed; retest with verified certificate chain; inspect voluntarily shared UF Calendar events |
| UF College of the Arts | WORKING | Public Events Calendar REST JSON | 5 of reported 46; venue, start/end, description, cost | Organizer/categories missing in tested page | Publisher permission; documented paging |
| UF Performing Arts | PARTIAL | Advertised iCal | 195 entries; titles, descriptions, dates, links | Includes 2025 history; all structured locations missing | Filter history; approved detail retrieval for venue/tickets |
| Florida Gators Athletics | NEEDS ACCESS | Homepage/platform/terms discovery | No schedule records parsed | SIDEARM restricts non-personal copying/display | UAA/SIDEARM permission or licensed schedule feed |
| UF Campus Closures | NOT YET TESTED | Policy/page discovery | No closure dataset parsed | Robots URL returns HTML; conservative local stop; web homepage extraction empty | UF Facilities-approved closure/outage feed or guided UI inspection |
| Gainesville city events | WORKING | Public HTML list | 10 cards: date, address, category, description, URL | Date only; initial page only; disclaimer web request was 403 | Official export/publication terms; approved detail access for clocks |
| Downtown / Bo Diddley Plaza | WORKING | Official city venue HTML | 9 event cards, including community/festival activity | Dates only; overlaps city calendar | Same city permission/export; deduplicate later |
| GainesvilleShows.com | PARTIAL | Public `/upcoming` HTML | 8 distinct events: artists, venue, date | Page advertises 167 shows; first 8 only, dated Oct 16; clocks/cost missing | Ask publisher/ShowSpace for feed/reuse; do not assume full coverage |
| GainesvilleEvents.com | WORKING | Advertised iCal | 1,052 events; 1,000 locations; source URLs | 208 equal start/end values; category/price absent; upstream rights unknown | Aggregator and upstream licensing/provenance confirmation |
| Visit Gainesville / Alachua County | PARTIAL | Public Events Calendar REST JSON | 5 of reported 3,656 across 732 pages; venue, category, cost | One sampled local event declares **Africa/Bujumbura** timezone | Tourism office reuse permission and timezone validation |
| Heartwood Soundstage | PARTIAL | Official `/shows` HTML | 100 archived 2025 cards | Initial `/events` path 404; current widget not parsed | Venue/OpenDate-approved current feed; archive is not current coverage |
| High Dive | BLOCKED | Website/policy discovery and closure corroboration | No current records | Robots redirects to HTML; historic venue closed May 2024 | Do not treat old venue listings as active; current official source required |
| The Wooly | NOT YET TESTED | `https://thewooly.co/` discovery | 200 but 114 bytes; no events | Inconclusive minimal/old website | Ask venue for current official calendar; aggregator listings are leads |
| Salty Dog Saloon / Midtown | PARTIAL | Official HTML | One published recurring happy-hour offer and schedule | No publication/expiry date or live confirmation | Merchant approval and ongoing confirmation |
| The Swamp Restaurant | PARTIAL | Restaurant JSON-LD | One venue, address and coordinates | **No event or special retrieved** | Merchant-authorized promotions feed/submissions |
| UF dining / Dine On Campus | BLOCKED | Robots discovery | No data | Robots excludes requested path for research client | UF dining/Chartwells permission; no private/mobile endpoint probing |
| Reddit r/ufl | NEEDS ACCESS | Approved OAuth test prepared | No posts | Prior Reddit approval required | Apply for external discovery/AI scope and read token |
| Reddit r/GNV | NEEDS ACCESS | Same OAuth test, subreddit switch | No posts | Same platform approval; moderator permission insufficient | Same application, with retention/deletion/AI terms |
| Public Instagram announcements | NEEDS ACCESS | Organizer-authorized official API test prepared | No posts | Public visibility is not scraping permission; no general event-search path established | Professional-account OAuth/app review; organizer rights |
| Authorized Discord announcements | NEEDS ACCESS | Official bot REST test prepared | No messages | Channel/history permission, organizer consent and possibly Message Content intent | Authorized announcement channel; no self-bot/user tokens |
| Yik Yak / Sidechat | NEEDS ACCESS | Preserved user-supplied interactive script | Previous posts/details/comments success **reported by user only** | Terms restrict automated collection/redistribution; no new login | Written Flower Ave authorization before tests or production |
| UF Libraries | WORKING | Advertised LibCal RSS + detail JSON-LD | 33 RSS events; 29 locations; dates/clocks/categories; 1 detail | RSS clocks omit timezone; UI says Eastern; detail confirms -04:00 | Library syndication agreement or authorized institutional API |
| Florida Museum | WORKING | Public Event JSON-LD | 10 events; dates/places; 9 coordinate pairs | iCal route robots-excluded; copyright restricts publication/commercial use | Written museum permission before publication |
| Harn Museum | PARTIAL | Advertised iCal + JSON-LD | 9 events; 5 locations; audience categories in iCal | Publishes **America/Chicago/-05:00** for October Gainesville events | Publisher confirmation/correction before reminders/live-now use |
| UF Alerts | PARTIAL | Advertised RSS | 10 archive items; publication dates/categories/links | Latest sampled item Sept 9; no active-status/expiry/geometry | Permission and authoritative resolution/expiry semantics |
| UF Society of Women Engineers | PARTIAL | Public WordPress RSS | 10 organization articles | Latest sampled March 26, 2026; **not an event calendar** | Organizer calendar/submissions for current STEM events |
| UF ACM | NOT YET TESTED | Public site discovery | 200 client shell; no records | No feed/Event JSON-LD found in response | Organizer-provided calendar/announcement authorization |
| SwampHacks XII | NOT YET TESTED | Official root redirects to `xii.swamphacks.com` | 200 client shell; no event records | No public feed/structured records established | Organizer-supplied calendar or approved UI/API investigation |
| Santa Fe College | NOT YET TESTED | Calendar redirects to `/events.html` | Page accessible; no records | No feed/Event JSON-LD established | Official export/authorized feed |
| THE FEST | NOT YET TESTED | Official schedule discovery | Page accessible; no performance records parsed | No feed/API established | Festival schedule feed and publication rights |
| UF GatorPerks food directory | NOT YET TESTED | Official HR page discovery | Accessible; no offers parsed | Faculty/staff program; student eligibility must not be inferred | HR/merchant-approved directory and eligibility |
| GatorBites | NOT YET TESTED | Official product page discovery | Product explanation accessible; **no live deals** | Waitlist/merchant-controlled deals; no public API established | Partnership, not verified-current offers yet |
| Gainesville RTS | NOT YET TESTED | Official site/feed discovery; GTFS lead | Homepage accessible; RSS advertised; no transit records | Historic GTFS links do not establish current/realtime feed | Current GTFS/GTFS-RT/service alerts and license from RTS |
| NWS alerts (additional lead) | NOT YET TESTED | Official API documentation | Documentation only | Outdoor-disruption supplement, not campus event discovery | Test Gainesville coordinates if needed later |

## Retest commands

Run at repository root with **Node 24**. Research dependencies/lockfiles are separate from application dependencies.

```powershell
npm.cmd ci --prefix research --ignore-scripts
node research/test.mjs  # lists all experiment IDs

node research/test.mjs gatorconnect-rss gatorconnect-ical
node research/test.mjs uf-calendar-json uf-calendar-page
node research/test.mjs uf-arts-json gatornights-html uf-libraries-rss
node research/test.mjs gainesvilleevents-ical visit-gainesville-json
node research/test.mjs gainesville-city-html bo-diddley-html gainesvilleshows-html
node research/test.mjs salty-dog-specials swamp-venue-jsonld

# Includes the known empty feed and robots-excluded iCal route:
node research/test.mjs all --compact

# Intentionally refresh only minimal public evidence:
node research/test.mjs all --save --compact
node research/report.mjs

# Homepage/policy discovery, not event validation:
node research/discover.mjs recsports uf-closures
```

[test.mjs](test.mjs) runs independently by ID; `all` continues across sources and exits nonzero on any request/parser failure, including the expected museum iCal robots stop. A parsed empty feed prints zero and `usefulRecordsParsed: false`; exit success alone does not mean useful data. There is no automatic pagination or full detail crawl. The client checks robots, respects declared crawl delays, uses bounded responses/timeouts, and stops an origin after 401/403/429 for the rest of that invocation.

[access/README.md](access/README.md) gives exact credentials and executable tests for Ticketmaster, Eventbrite, Reddit, Discord and Instagram. All five missing-access guards were run at **03:35:30–03:35:31 UTC**: no requests sent, HTTP null, missing variable names printed. This verifies local guards, **not the remote APIs**. No credentials/token grants/accounts were obtained. No messages or permission requests were sent to publishers.

## Yik Yak preserved first

The initial prompt omitted the implementation. Preservation notes and a request for the missing source preceded public-source testing. On receiving the follow-up, the original was saved immediately at [yikyak/test.mjs](yikyak/test.mjs). The personal number was never written to disk. The UF group constant remains `1e5c57df-58a6-4dc0-9f3e-7f369f25d78f`.

All seven steps remain: SMS, code verification, UF check, recent posts, commented-post selection, full post, comments. Changes: `YIKYAK_PHONE` validation and safe error output, including suppression of internal raw library errors discovered by source inspection. [yikyak/README.md](yikyak/README.md) documents interactive execution. `sidechat.js` **2.6.6** is pinned separately; the user's previously successful installed version was not provided. Registry metadata declares MIT/Node >=18; it is an unofficial reverse-engineered wrapper without a platform stability guarantee.

New checks: syntax, import resolution and missing-phone guard passed; no SMS was initiated. **No newly retrieved account, posts or comments.** Previous success is user-reported technical evidence only. No authenticated payload or social sample is retained. Do not run the library's bundled demos: some print tokens or perform writes.

The [Sidechat Terms of Use](https://sidechat.notion.site/Sidechat-Terms-of-Use-d2f718ddad2f403b85bba67078fbdf18) reviewed (page dated March 30, 2023) explicitly cover Sidechat and Yik Yak. They restrict use to personal purposes and restrict automated downloading, reverse engineering, reproduction and redistribution (§1.3). **The proposed Breadcrumb use is not authorized by those terms; obtain separate written permission.** Check the current in-app agreement for amendments. The library's MIT software license does not license posts or platform access. No SMS test should be initiated until permission exists. Public web views are not a workaround. Simple `/terms` URLs failed in the web tool; the site's footer links to Notion. An unrelated `side.chat` AI-business site was excluded.

## Fields, freshness and completeness

- **UF Calendar:** The 1,000-record JSON response spans October 16, 2026–February 4, 2027. Extracted: 836 locations, 278 coordinate pairs, 520 end times, 320 costs, 904 categorized records and group titles for all records. Unpaginated results stop at 1,000; `/paginate/5?page=1` reports 1,231 total/247 pages. Only page 1 was fetched. iCal's 875 components reflect a different feed/recurrence window, not necessarily missing events. Two sample workshop records are cross-listed under different groups.
- **GatorConnect:** RSS has namespaced `start`, `end`, `location`, `host` fields, verified against actual returned schema. All 340 have clocks/location/category; host presence is recorded without contact values. iCal spans September 15–November 15, 2026, including past/ongoing items. Neither feed proved pagination. Sample RSS `pubDate` closely matches retrieval time: do not treat it as original event publication. No reliable price/perk/free-food field was established.
- **Local feeds:** GainesvilleEvents spans October 16, 2026–March 14, 2027; 208 equal start/end values do not establish duration. No feed pagination established. Performing Arts spans March 2025–April 2027 with 67 starts on/after the current UTC day; all 195 lack locations. Initial city/Bo Diddley pages provide dates, not clocks or expanded recurrence. The corrected Bo Diddley URL is `/Venues/Bo-Diddley-Plaza`; initial `/Parks/...` returned 404. GainesvilleShows' eight parsed URLs are distinct, but do not represent its advertised full inventory.
- **GatorNights:** Fall 2026 heading supplies year; cards are October 7, October 27, December 2. Campus timezone is explicitly marked inferred. The page describes free programming for enrolled UF students; per-card cost is not populated. No invented end times, ticket availability or free-food inventory.
- **Libraries:** RSS supplies `libcal:date/start/end/location`; one Event JSON-LD detail confirms October 19, 12:50–13:40, offset -04:00. RSS itself omits zone; UI says Eastern Time. Its 33 items include 29 locations; online/physical places vary. Presenter/attendee/contact values were omitted.
- **Timezone defects:** Visit Gainesville's Africa/Bujumbura value changes UTC interpretation; Harn's America/Chicago/-05:00 is unexpected for Gainesville in October. Tests preserve and expose source values, **not silently repair them**. Ask publishers before time-sensitive answers/reminders. Floating/all-day values are not precise instants. `futureOrToday` compares explicit timestamps/date-only values with the current UTC day, not Gainesville's current day or active-state status.
- **Archives/offers:** SWE latest sampled article March 26; UF Alert latest sample September 9. They are not verified upcoming events/active incidents. All 100 Heartwood cards extracted are June–December 2025; current widget not parsed. Salty Dog's recurring offer lacks publication/expiry date and was not validated for tonight. Swamp venue metadata includes no deals.

All exact statuses, dates, field counts, missing fields and sample facts are in [RESULTS.md](RESULTS.md) and linked JSON evidence. No raw HTTP body was saved. Public payloads may include editor/contact/registration identifiers; parsers omit these values. Retained samples contain only event facts, links and a short offer fact, not full descriptions, images, social content, attendees, SMS codes, phone numbers or tokens. These are research notes, not an application seed dataset or a redistribution license.

## Terms and reuse assessment

This records publisher requirements and uncertainty, not legal clearance. Primary sources checked on the investigation date:

| Source | Consequence for Breadcrumb |
|---|---|
| [Engage API documentation](https://engage-api.campuslabs.com/) | Administrative API keys are institution-controlled and scopeable. Documentation restricts sharing API access with third-party vendors, and separately advertises public RSS/iCal for syndication. Ask UF Student Engagement for permitted display/AI scope. No internal discovery JSON endpoint was needed or tested. |
| [LiveWhale API](https://support.livewhale.com/live/blurbs/api) / [external-display guide](https://support.livewhale.com/calendar-onboarding/widgets-and-api/) | Public REST feeds support external displays while respecting visibility. No hidden-content requests. UF's content rights remain separate. Vendor recommends caching high-traffic responses 5–60 minutes; no polling pipeline was built. |
| [Events Calendar REST documentation](https://dev.theeventscalendar.com/knowledgebase/introduction-to-the-events-calendar-rest-api/) | Public structured events are supported by the plugin. Software/API access does not license every publisher's descriptions/images. Ask Arts/Harn/Visit Gainesville about syndication and AI scope. |
| [SIDEARM terms](https://sidearmsports.com/sports/2022/12/7/terms-of-service) | §§2.1–2.3 restrict copying/display beyond personal purposes without permission. No Athletics schedule ingestion was tested after this restriction was identified. |
| [Florida Museum copyright](https://www.floridamuseum.ufl.edu/about/copyright/) | Written permission required for commercial use/electronic publication. Educational research retrieval does not authorize publication in Breadcrumb. Excluded iCal path was not fetched. |
| [Ticketmaster API](https://developer.ticketmaster.com/products-and-docs/apis/discovery/v2/) / [terms](https://developer.ticketmaster.com/support/terms-of-use/) | Register app/get consumer key. Terms limit monetization/onward use, storage to reasonable service periods, and require removal within 24 hours of an owner's request. API reference says 5 req/sec, FAQ says 2; use lower/account-approved quota until clarified. Both list 5,000/day; deep pagination limited to first 1,000 items. No live key/Gainesville results tested. |
| [Eventbrite deprecation notice](https://www.eventbrite.com/platform/docs/by-date) / [developer portal](https://www.eventbrite.com/platform/api-keys/) | General event search retired December 2019. Prepared test reads an authorized organization's live events, not arbitrary Gainesville search. Broad discovery needs partner approval. Docs returned 429 during research; no repeated/alternate-host requests after that response. |
| [Reddit Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy), updated October 5, 2026 | Prior approval required, including appropriate research/commercial authorization. No anonymous JSON/RSS harvesting fallback. Seek explicit Gemini context/answers, storage, attribution/deletion and onward-display scope. Retrieval for inference is not automatically model training; neither permission was assumed. |
| [Instagram official docs](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/) / [Meta Postman collection](https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login) | Test targets organizer-authorized professional-account media only. No approved arbitrary-public-account harvesting path established. Some Meta docs unavailable through web tool; verify app version/permissions/review during onboarding. No unofficial scraper. |
| [Discord Message API](https://docs.discord.com/developers/resources/message#get-channel-messages) | Official bot must be installed with channel/history access and organizer consent for onward publication. Content can require Message Content intent. Incoming webhooks post; they do not read announcements. No DMs, user tokens, member lists or unrelated channels. |
| Other UF pages, city, Libraries, aggregators, venues, SWE | Comprehensive open-content reuse license **not established**. Robots acceptance/advertised feeds do not imply unrestricted publication or AI rights. City disclaimer request failed with 403 in web tool. Ask publishers for fields, attribution, retention/cancellation, image and AI-use terms. Aggregator availability does not erase upstream restrictions. |

High Dive closure was corroborated by [UF's WUFT reporting](https://www.wuft.org/entertainment/2024-05-20/iconic-high-dive-venue-closes-on-a-high-note). Additional [NWS API documentation](https://www.weather.gov/documentation/services-web-api) and [RTS](https://go-rts.com/) are leads only; historic transit feeds were not called current.

## Breadcrumb usefulness and production suitability

| Question/filter | Best tested inputs | Boundary |
|---|---|---|
| Campus clubs, meetings, hobbies | GatorConnect host/category/text; UF Calendar group/tags; Libraries | Filtering inputs exist, not proof every requested community has an event in this snapshot. No memberships or student interests collected. |
| Women in STEM, robotics, gaming | Above plus organizer-approved calendars | SWE blog supplies context only. Prefer explicit organization/event labels; do not infer sensitive user traits. |
| Near Reitz / walking distance | UF Calendar coordinates, GatorConnect/GatorNights locations, museum places | Coordinates incomplete. No geocoding, distances or walking times were implemented or fabricated. |
| Free food / giveaways | GatorNights activities; GatorConnect descriptions; organizer submissions | No real-time stock guarantee or reliable structured free-food field. Free admission is not free food. |
| Concerts/festivals/Gainesville tonight | Local feeds, city/Bo Diddley, Arts/Performing Arts; Visit Gainesville with validation | Dates can be stale, duplicated, cancelled or ticketed; validate timezones. |
| Bars/happy hours/student deals | Salty Dog published offer; merchant-authorized submissions | No live confirmation. GatorPerks not automatically student-eligible; Swamp metadata has no specials. |
| Campus disruptions | UF Alert archive; approved Facilities/RTS feed later | No working current closures/realtime transit dataset confirmed. Archives cannot establish active safety status. |
| Ask Breadcrumb/personalized alerts | Licensed records with source URLs, event clocks, eligibility and retrieval times | No chatbot or notifications built. Permission should cover sending content to Gemini, summaries, publication, storage and deletion. External text remains untrusted data. |

Prioritize **UF-approved GatorConnect, UF Calendar JSON, Libraries, Arts and GatorNights** for future production evaluation. Add licensed local/merchant feeds next. Ticketmaster is a plausible supplement once credentialed tests and terms review succeed. Resolve Visit Gainesville/Harn timezone issues. Keep Yik Yak, unapproved Reddit/Instagram collection and Discord announcements out until platform/publisher permissions exist. No source is declared fully production-cleared by this research.

## Validation and repository boundaries

Research scripts were syntax checked and public experiments executed. Missing-access paths were exercised without credentials. Research dependency audits reported zero vulnerabilities. Ignore checks cover research dependencies, `.env.local`, private/session paths. Root application packages/lockfile were untouched; application checks were not run because app code/dependencies did not change and root `node_modules` is absent.

The local Next.js guide directory named by AGENTS.md is absent. No Next.js code/conventions were written or changed; research uses independent Node scripts only. No application packages were installed to conduct research.
