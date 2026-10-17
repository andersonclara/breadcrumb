# Second-pass execution evidence

Generated offline from the minimal JSON files in [evidence/](evidence/). Dates/times are UTC. A 200 page or empty array is not working event retrieval. Null status means no content response: see the error and robots metadata. Requests here include discovery, policy and schema checks; do not count them as independent event sources.

Every saved response was anonymous. Credentialed Calendar access was tested only through its local missing-access guard, with no request. Descriptions and contact/editor/attendee values were discarded. At most two factual samples per individual experiment/question are retained. A repeated source in two experiments is not additional coverage.

## Main coverage snapshot

Executed 2026-10-17T12:14:15.778Z; timezone America/New_York. Window 2026-10-17 inclusive to 2026-11-16 exclusive. This counts starts, so ongoing multi-day events that started earlier may be omitted.

| Source | Returned | Starts in window | Location | Organizer | Price | Exact clocks | Assumed zone | Date only |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| gatorconnect | 339 | 335 | 339 | 333 | 0 | 339 | 0 | 0 |
| uf-calendar | 568 | 565 | 495 | 568 | 228 | 379 | 0 | 189 |
| libraries | 33 | 29 | 29 | 0 | 0 | 0 | 33 | 0 |
| gatornights | 3 | 1 | 3 | 0 | 0 | 0 | 3 | 0 |
| gainesvilleevents | 1014 | 781 | 962 | 0 | 0 | 1014 | 0 | 0 |
| arts | 24 | 24 | 24 | 0 | 24 | 24 | 0 | 0 |

1981 rows; 1735 starts in window; 1693 candidate groups after 42 extra rows were grouped. This is neither a unique-event census nor a measure of independently corroborated events.

| Question | Candidates | Evidence support |
|---|---:|---|
| What's happening near Reitz right now? | 0 | NO_MATCH_IN_TESTED_SNAPSHOT |
| Any free food at Turlington? | 0 | NO_MATCH_IN_TESTED_SNAPSHOT |
| Any Women in STEM events this weekend? | 0 | NO_MATCH_IN_TESTED_SNAPSHOT |
| Are there any gaming events? | 31 | PARTIAL |
| Are there any robotics events? | 4 | PARTIAL |
| I'm bored tonight. What's going on in Gainesville? | 23 | PARTIAL |
| What is scheduled at or around Reitz? | 104 | PARTIAL |
| Any events within walking distance of Reitz? | 118 | PARTIAL |
| Which events have published free admission? | 191 | PARTIAL |
| Where should we look for food, giveaways and free activities? | 25 | PARTIAL |
| Which bars have specials tonight? | 0 | NO_MATCH_IN_TESTED_SNAPSHOT |

Full rule, missing-field, date-range, pagination, sample and limitation details: [coverage.json](evidence/coverage.json).

## Parsed inventories outside the main snapshot

| Test | Count | Relevant fields populated (count) | Evidence |
|---|---:|---|---|
| student-engagement-cards | 13 | name: 13, description: 13, location: 12, start: 13, url: 13 | [additional.json](evidence/additional.json) |
| gator-market-dates | 4 | name: 4, location: 4, start: 4, url: 4 | [additional.json](evidence/additional.json) |
| careers-cards | 10 | name: 10, location: 8, start: 10, end: 1, url: 10 | [additional.json](evidence/additional.json) |
| careers-page2 | 10 | name: 10, location: 10, start: 10, url: 10 | [additional.json](evidence/additional.json) |
| heartwood-live-cards | 63 | name: 63, location: 63, url: 63 | [additional.json](evidence/additional.json) |
| heartwood-detail | 1 | name: 1, location: 1, url: 1 | [additional.json](evidence/additional.json) |
| engineering-current-calendar | 6 | name: 6, description: 4, location: 4, start: 6, category: 5, url: 6 | [additional.json](evidence/additional.json) |
| engineering-robotics-ical | 1 | name: 1, description: 1, location: 1, start: 1, end: 1, category: 1, url: 1 | [additional.json](evidence/additional.json) |
| Closure_Polygon_view | 5 | See evidence; count alone is not success | [closures.json](evidence/closures.json) |
| Closure_Detour_view | 5 | See evidence; count alone is not success | [closures.json](evidence/closures.json) |
| uf-calendar-server-search | 1 | name: 1, description: 1, location: 1, start: 1, organizer: 1, category: 1, url: 1 | [context.json](evidence/context.json) |
| uf-calendar-individual-json | 1 | name: 1, description: 1, location: 1, start: 1, end: 1, organizer: 1, price: 1, category: 1, url: 1, latitude: 1, longitude: 1 | [details.json](evidence/details.json) |
| uf-calendar-individual-json | 1 | name: 1, description: 1, location: 1, start: 1, end: 1, organizer: 1, category: 1, url: 1 | [details.json](evidence/details.json) |
| careers-rss | 10 | name: 10, description: 8, url: 10 | [probes.json](evidence/probes.json) |
| engineering-rss | 7 | name: 7, description: 7, url: 7 | [probes.json](evidence/probes.json) |
| taps-rss | 10 | name: 10, description: 10, category: 10, url: 10 | [probes.json](evidence/probes.json) |
| gatorlan-jsonld | 0 | See evidence; count alone is not success | [probes.json](evidence/probes.json) |
| hq-gainesville | 0 | See evidence; count alone is not success | [probes.json](evidence/probes.json) |

## Exact executed requests

| UTC start | Test/context | HTTP / error | Format | Exact URL | Evidence |
|---|---|---|---|---|---|
| 2026-10-17T12:03:32.844Z | wicse | 200 | text/html; charset=utf-8 | https://ufwicse.com/events | [JSON](evidence/exploration.json) |
| 2026-10-17T12:03:32.982Z | closures | 200 | text/html; charset=UTF-8 | https://campusclosures.ufl.edu/ | [JSON](evidence/exploration.json) |
| 2026-10-17T12:03:33.134Z | closures-list | 200 | text/html; charset=UTF-8 | https://campusclosures.ufl.edu/closures | [JSON](evidence/exploration.json) |
| 2026-10-17T12:03:34.132Z | gator-market | 200 | text/html; charset=UTF-8 | https://union.ufl.edu/gatormarket/ | [JSON](evidence/exploration.json) |
| 2026-10-17T12:03:36.210Z | student-engagement | 200 | text/html; charset=UTF-8 | https://studentengagement.ufl.edu/ | [JSON](evidence/exploration.json) |
| 2026-10-17T12:03:37.009Z | careers | 200 | text/html; charset=UTF-8 | https://careerhub.ufl.edu/events/ | [JSON](evidence/exploration.json) |
| 2026-10-17T12:03:37.406Z | engineering | 200 | text/html; charset=UTF-8 | https://www.eng.ufl.edu/undergraduate/news-events/events/ | [JSON](evidence/exploration.json) |
| 2026-10-17T12:03:38.191Z | robotics | 200 | text/html; charset=UTF-8 | https://mae.ufl.edu/students/organizations/gator-robotics/ | [JSON](evidence/exploration.json) |
| 2026-10-17T12:03:38.914Z | taps | 200 | text/html; charset=UTF-8 | https://taps.ufl.edu/ | [JSON](evidence/exploration.json) |
| 2026-10-17T12:03:41.882Z | swe-events | 200 | text/html; charset=UTF-8 | https://uf.swe.org/ | [JSON](evidence/exploration.json) |
| 2026-10-17T12:03:43.506Z | glory-days | 200 | text/html; charset=UTF-8 | https://glorydayspresents.com/ | [JSON](evidence/exploration.json) |
| 2026-10-17T12:03:43.925Z | heartwood | 200 | text/html; charset=utf-8 | https://www.heartwoodsoundstage.com/shows | [JSON](evidence/exploration.json) |
| 2026-10-17T12:03:46.563Z | fest | 200 | text/html; charset=UTF-8 | https://thefestfl.com/schedule/ | [JSON](evidence/exploration.json) |
| 2026-10-17T12:03:46.941Z | city-library | 403 | text/html; charset=UTF-8 | https://www.aclib.us/events | [JSON](evidence/exploration.json) |
| 2026-10-17T12:03:47.176Z | start-gg | 200 | text/html; charset=utf-8 | https://www.start.gg/tournament/gatorlan-fall-2026/details | [JSON](evidence/exploration.json) |
| 2026-10-17T12:07:18.737Z | wicse/page | 200 | text/html; charset=utf-8 | https://ufwicse.com/events | [JSON](evidence/assets.json) |
| 2026-10-17T12:07:18.895Z | wicse/assets[0] | 200 | text/javascript; charset=utf-8 | https://ufwicse.com/main.js | [JSON](evidence/assets.json) |
| 2026-10-17T12:07:19.922Z | closures/page | 200 | text/html; charset=UTF-8 | https://campusclosures.ufl.edu/ | [JSON](evidence/assets.json) |
| 2026-10-17T12:07:20.095Z | closures/assets[0] | 200 | application/javascript | https://campusclosures.ufl.edu/main-es2015.3d9505e2480223f88e68.js | [JSON](evidence/assets.json) |
| 2026-10-17T12:07:21.283Z | heartwood/page | 200 | text/html; charset=utf-8 | https://www.heartwoodsoundstage.com/shows | [JSON](evidence/assets.json) |
| 2026-10-17T12:08:04.014Z | wicse-public-ical | ROBOTS_STOP | — | https://calendar.google.com/calendar/ical/291pbpr99guo0kl6md2g0nghk8%40group.calendar.google.com/public/basic.ics | [JSON](evidence/probes.json) |
| 2026-10-17T12:08:04.127Z | closure-polygon-metadata | 200 | text/plain; charset=UTF-8 | https://gis.ufl.edu/Hosting/rest/services/Hosted/Closure_Polygon_view/FeatureServer/0?f=pjson | [JSON](evidence/probes.json) |
| 2026-10-17T12:08:04.301Z | closure-detour-metadata | 200 | text/plain; charset=UTF-8 | https://gis.ufl.edu/Hosting/rest/services/Hosted/Closure_Detour_view/FeatureServer/0?f=pjson | [JSON](evidence/probes.json) |
| 2026-10-17T12:08:05.209Z | careers-rss | 200 | application/rss+xml; charset=UTF-8 | https://careerhub.ufl.edu/events/feed/ | [JSON](evidence/probes.json) |
| 2026-10-17T12:08:05.708Z | engineering-rss | 200 | application/rss+xml; charset=UTF-8 | https://www.eng.ufl.edu/undergraduate/news-events/events-calendar/feed/ | [JSON](evidence/probes.json) |
| 2026-10-17T12:08:06.415Z | taps-rss | 200 | application/rss+xml; charset=UTF-8 | https://taps.ufl.edu/feed/ | [JSON](evidence/probes.json) |
| 2026-10-17T12:08:06.864Z | gatorlan-jsonld | 200 | text/html; charset=utf-8 | https://www.start.gg/tournament/gatorlan-fall-2026/details | [JSON](evidence/probes.json) |
| 2026-10-17T12:11:42.624Z | hq-gainesville | 200 | application/json | https://api.joinhq.app/v1/public/shows?when=upcoming&city=Gainesville&country=United+States&limit=3 | [JSON](evidence/probes.json) |
| 2026-10-17T12:11:44.807Z | Closure_Polygon_view/metadataRequest | 200 | application/json; charset=UTF-8 | https://gis.ufl.edu/Hosting/rest/services/Hosted/Closure_Polygon_view/FeatureServer/0?f=json | [JSON](evidence/closures.json) |
| 2026-10-17T12:11:45.050Z | Closure_Polygon_view/requests[0] | 200 | application/json; charset=UTF-8 | https://gis.ufl.edu/Hosting/rest/services/Hosted/Closure_Polygon_view/FeatureServer/0/query?where=1%3D1&returnCountOnly=true&f=json | [JSON](evidence/closures.json) |
| 2026-10-17T12:11:46.008Z | Closure_Polygon_view/requests[1] | 200 | application/json; charset=UTF-8 | https://gis.ufl.edu/Hosting/rest/services/Hosted/Closure_Polygon_view/FeatureServer/0/query?where=1%3D1&outFields=close_id%2Cclose_type%2Cclose_stat%2Cclose_start%2Cclose_end%2Cclose_note&returnGeometry=true&outSR=4326&resultRecordCount=5&f=json | [JSON](evidence/closures.json) |
| 2026-10-17T12:11:47.026Z | Closure_Polygon_view/requests[2] | 200 | application/json; charset=UTF-8 | https://gis.ufl.edu/Hosting/rest/services/Hosted/Closure_Polygon_view/FeatureServer/0/query?where=close_stat%3D%27PUBLISHED%27&outFields=close_id%2Cclose_type%2Cclose_stat%2Cclose_start%2Cclose_end%2Cclose_note&returnGeometry=true&outSR=4326&resultRecordCount=5&f=json | [JSON](evidence/closures.json) |
| 2026-10-17T12:11:48.036Z | Closure_Detour_view/metadataRequest | 200 | application/json; charset=UTF-8 | https://gis.ufl.edu/Hosting/rest/services/Hosted/Closure_Detour_view/FeatureServer/0?f=json | [JSON](evidence/closures.json) |
| 2026-10-17T12:11:49.038Z | Closure_Detour_view/requests[0] | 200 | application/json; charset=UTF-8 | https://gis.ufl.edu/Hosting/rest/services/Hosted/Closure_Detour_view/FeatureServer/0/query?where=1%3D1&returnCountOnly=true&f=json | [JSON](evidence/closures.json) |
| 2026-10-17T12:11:50.055Z | Closure_Detour_view/requests[1] | 200 | application/json; charset=UTF-8 | https://gis.ufl.edu/Hosting/rest/services/Hosted/Closure_Detour_view/FeatureServer/0/query?where=1%3D1&outFields=close_id%2Cclose_type%2Cclose_stat%2Cclose_start%2Cclose_end%2Cclose_note%2Cadaaccess&returnGeometry=true&outSR=4326&resultRecordCount=5&f=json | [JSON](evidence/closures.json) |
| 2026-10-17T12:11:51.052Z | Closure_Detour_view/requests[2] | 200 | application/json; charset=UTF-8 | https://gis.ufl.edu/Hosting/rest/services/Hosted/Closure_Detour_view/FeatureServer/0/query?where=close_stat%3D%27PUBLISHED%27&outFields=close_id%2Cclose_type%2Cclose_stat%2Cclose_start%2Cclose_end%2Cclose_note%2Cadaaccess&returnGeometry=true&outSR=4326&resultRecordCount=5&f=json | [JSON](evidence/closures.json) |
| 2026-10-17T12:12:37.802Z | student-engagement-cards | 200 | text/html; charset=UTF-8 | https://studentengagement.ufl.edu/ | [JSON](evidence/additional.json) |
| 2026-10-17T12:12:40.312Z | gator-market-dates | 200 | text/html; charset=UTF-8 | https://union.ufl.edu/gatormarket/ | [JSON](evidence/additional.json) |
| 2026-10-17T12:12:44.520Z | careers-cards | 200 | text/html; charset=UTF-8 | https://careerhub.ufl.edu/events/ | [JSON](evidence/additional.json) |
| 2026-10-17T12:12:49.081Z | careers-page2 | 200 | text/html; charset=UTF-8 | https://careerhub.ufl.edu/events/page/2/ | [JSON](evidence/additional.json) |
| 2026-10-17T12:12:53.004Z | heartwood-live-cards | 200 | text/html; charset=utf-8 | https://www.heartwoodsoundstage.com/shows | [JSON](evidence/additional.json) |
| 2026-10-17T12:12:53.270Z | heartwood-detail | 200 | text/html; charset=utf-8 | https://www.heartwoodsoundstage.com/shows/butcher-babies-17-oct | [JSON](evidence/additional.json) |
| 2026-10-17T12:12:54.199Z | engineering-current-calendar | 200 | text/html; charset=UTF-8 | https://www.eng.ufl.edu/undergraduate/news-events/events-calendar/ | [JSON](evidence/additional.json) |
| 2026-10-17T12:12:55.282Z | engineering-robotics-ical | 200 | text/calendar; charset=utf-8 | https://www.eng.ufl.edu/undergraduate/news-events/events/gator-robotics-gbm-5/ical/ | [JSON](evidence/additional.json) |
| 2026-10-17T12:13:15.497Z | gatorconnect/first | 200 | application/rss+xml; charset=utf-8 | https://gatorconnect.ufl.edu/events.rss | [JSON](evidence/cache.json) |
| 2026-10-17T12:13:19.311Z | uf-calendar/first | 200 | application/json; charset=UTF-8 | https://calendar.ufl.edu/live/json/events/paginate/5?page=1 | [JSON](evidence/cache.json) |
| 2026-10-17T12:13:20.209Z | uf-calendar/second | 200 | application/json; charset=UTF-8 | https://calendar.ufl.edu/live/json/events/paginate/5?page=1 | [JSON](evidence/cache.json) |
| 2026-10-17T12:13:20.572Z | libraries/first | 200 | application/rss+xml; charset=utf-8 | https://libcal.uflib.ufl.edu/rss.php?iid=6&m=month&cid=22582 | [JSON](evidence/cache.json) |
| 2026-10-17T12:13:20.820Z | gainesvilleevents/first | 200 | text/calendar | https://gainesvilleevents.com/feed.ics | [JSON](evidence/cache.json) |
| 2026-10-17T12:13:21.171Z | gainesvilleevents/second | 304 | — | https://gainesvilleevents.com/feed.ics | [JSON](evidence/cache.json) |
| 2026-10-17T12:14:15.822Z | gatorconnect | 200 | application/rss+xml; charset=utf-8 | https://gatorconnect.ufl.edu/events.rss | [JSON](evidence/coverage.json) |
| 2026-10-17T12:14:16.761Z | uf-calendar | 200 | application/json; charset=UTF-8 | https://calendar.ufl.edu/live/json/events/start_date/2026-10-17/end_date/2026-11-16/paginate/100?page=1 | [JSON](evidence/coverage.json) |
| 2026-10-17T12:14:17.224Z | uf-calendar | 200 | application/json; charset=UTF-8 | https://calendar.ufl.edu/live/json/events/start_date/2026-10-17/end_date/2026-11-16/paginate/100?page=2 | [JSON](evidence/coverage.json) |
| 2026-10-17T12:14:18.152Z | uf-calendar | 200 | application/json; charset=UTF-8 | https://calendar.ufl.edu/live/json/events/start_date/2026-10-17/end_date/2026-11-16/paginate/100?page=3 | [JSON](evidence/coverage.json) |
| 2026-10-17T12:14:19.234Z | uf-calendar | 200 | application/json; charset=UTF-8 | https://calendar.ufl.edu/live/json/events/start_date/2026-10-17/end_date/2026-11-16/paginate/100?page=4 | [JSON](evidence/coverage.json) |
| 2026-10-17T12:14:20.252Z | uf-calendar | 200 | application/json; charset=UTF-8 | https://calendar.ufl.edu/live/json/events/start_date/2026-10-17/end_date/2026-11-16/paginate/100?page=5 | [JSON](evidence/coverage.json) |
| 2026-10-17T12:14:21.125Z | uf-calendar | 200 | application/json; charset=UTF-8 | https://calendar.ufl.edu/live/json/events/start_date/2026-10-17/end_date/2026-11-16/paginate/100?page=6 | [JSON](evidence/coverage.json) |
| 2026-10-17T12:14:22.098Z | libraries | 200 | application/rss+xml; charset=utf-8 | https://libcal.uflib.ufl.edu/rss.php?iid=6&m=month&cid=22582 | [JSON](evidence/coverage.json) |
| 2026-10-17T12:14:22.486Z | gatornights | 200 | text/html; charset=UTF-8 | https://studentengagement.ufl.edu/gatornights/ | [JSON](evidence/coverage.json) |
| 2026-10-17T12:14:24.526Z | gainesvilleevents | 200 | text/calendar | https://gainesvilleevents.com/feed.ics | [JSON](evidence/coverage.json) |
| 2026-10-17T12:14:25.320Z | arts | 200 | application/json; charset=UTF-8 | https://arts.ufl.edu/wp-json/tribe/events/v1/events?per_page=50&start_date=2026-10-17&end_date=2026-11-16 | [JSON](evidence/coverage.json) |
| 2026-10-17T12:14:49.914Z | [0] | 200 | text/html; charset=utf-8 | https://ufwicse.com/robots.txt | [JSON](evidence/policy-diagnostics.json) |
| 2026-10-17T12:14:50.019Z | [1] | 200 | text/html; charset=UTF-8 | https://campusclosures.ufl.edu/robots.txt | [JSON](evidence/policy-diagnostics.json) |
| 2026-10-17T12:14:50.325Z | [2] | 200 | text/html; charset=UTF-8 | https://highdivegainesville.com/robots.txt | [JSON](evidence/policy-diagnostics.json) |
| 2026-10-17T12:15:25.338Z | engineering-feed-detail-discovery | TimeoutError | — | https://www.eng.ufl.edu/undergraduate/news-events/events-calendar/feed/ | [JSON](evidence/details.json) |
| 2026-10-17T12:18:50.875Z | uf-calendar-individual-json | 200 | application/json; charset=UTF-8 | https://calendar.ufl.edu/live/events/58461-into-the-woods@JSON | [JSON](evidence/details.json) |
| 2026-10-17T12:18:52.357Z | uf-calendar-individual-json | 200 | application/json; charset=UTF-8 | https://calendar.ufl.edu/live/events/57873-florida-gators-softball-vs-carson-newman@JSON | [JSON](evidence/details.json) |
| 2026-10-17T12:19:19.655Z | nws-point | ROBOTS_STOP | — | https://api.weather.gov/points/29.6465,-82.3478 | [JSON](evidence/context.json) |
| 2026-10-17T12:19:19.848Z | nws-active-alerts | ROBOTS_STOP | — | https://api.weather.gov/alerts/active?point=29.6465,-82.3478 | [JSON](evidence/context.json) |
| 2026-10-17T12:19:19.875Z | uf-calendar-server-search | 200 | application/json; charset=UTF-8 | https://calendar.ufl.edu/live/json/events/search/gaming/start_date/2026-10-17/end_date/2026-11-16/paginate/5?page=1 | [JSON](evidence/context.json) |

304 in the cache experiment is successful conditional validation. The generic HTTP helper labels non-2xx responses as errors; cache.mjs explicitly distinguishes 304. ArcGIS service errors can appear inside HTTP 200; closures.mjs also checks the JSON error field. Robots-policy metadata is retained with each request, and redirects are recorded in JSON.

## Boundaries

No raw payloads, social posts, authenticated data, cookies, secrets, recurring job, AI call, geocoder, routing service or production integration. The evidence files document retrieval, not redistribution permission. See [REPORT.md](REPORT.md) for source-specific interpretation and [OPPORTUNITIES.md](OPPORTUNITIES.md) for proposed experiments.
