# Nightlife execution evidence

Generated from the small public metadata/fact files in [evidence/](evidence/). UTC times. HTTP 200 alone is not event retrieval. Counts overlap across methods and are not a total of unique events. Full descriptions, raw pages, images and full OCR text are not retained here.

## Event/offer experiments

| Test | HTTP | Records | Location field | Date/start field | Cost field | Raw schedule | Evidence kind |
|---|---:|---:|---:|---:|---:|---:|---|
| glory-gainesville | 200 | 28 | 28 | 28 | 0 | 28 | scheduled-venue-activity |
| magnitude-events-food | 200 | 8 | 8 | 2 | 0 | 8 | scheduled-venue-activity |
| magnitude-pride-detail | 200 | 1 | 1 | 1 | 0 | 1 | scheduled-venue-activity |
| magnitude-festival-detail | 200 | 1 | 1 | 1 | 0 | 1 | scheduled-venue-activity |
| looseys-trivia | 200 | 1 | 1 | 1 | 0 | 1 | scheduled-venue-activity |
| looseys-karaoke | 200 | 1 | 1 | 1 | 1 | 1 | scheduled-venue-activity |
| swamp-head-json | 200 | 20 | 0 | 20 | 0 | 0 | scheduled-venue-activity |
| swamp-head-ical | 200 | 27 | 0 | 27 | 0 | 0 | scheduled-venue-activity |
| bull-calendar-lead | 200 | 1 | 1 | 0 | 0 | 0 | calendar-discovery-only |
| cypress-calendar-lead | 200 | 1 | 1 | 0 | 0 | 0 | calendar-discovery-only |
| salty-weekly | 200 | 7 | 7 | 0 | 0 | 7 | recurring-offer-not-dated-confirmation |

All experiments are anonymous. Exact tested paging information, missing fields and at most two examples per experiment are in [records.json](evidence/records.json). Google embed counts are discovery leads, not retrieved calendar events. REST and iCal overlap; do not sum them.

| Test | UTC start | HTTP/error | Format | Exact URL |
|---|---|---|---|---|
| glory-gainesville | 2026-10-17T12:35:40.842Z | 200 | text/html; charset=UTF-8 | https://glorydayspresents.com/ |
| magnitude-events-food | 2026-10-17T12:35:42.606Z | 200 | text/html;charset=utf-8 | https://www.fmbrewing.com/ |
| magnitude-pride-detail | 2026-10-17T12:35:42.912Z | 200 | text/html;charset=utf-8 | https://www.fmbrewing.com/event-calendar/pride-party |
| magnitude-festival-detail | 2026-10-17T12:35:43.913Z | 200 | text/html;charset=utf-8 | https://www.fmbrewing.com/event-calendar/florida-forever-festival |
| looseys-trivia | 2026-10-17T12:35:45.075Z | 200 | text/html; charset=UTF-8 | https://www.looseys.com/events/monday-trivia/ |
| looseys-karaoke | 2026-10-17T12:35:45.353Z | 200 | text/html; charset=UTF-8 | https://www.looseys.com/events/karaoke-party/ |
| swamp-head-json | 2026-10-17T12:35:57.169Z | 200 | application/json; charset=UTF-8 | https://swamphead.com/wp-json/tribe/events/v1/events?per_page=20&start_date=2026-10-17&end_date=2026-11-16 |
| swamp-head-ical | 2026-10-17T12:35:58.142Z | 200 | text/calendar; charset=UTF-8 | https://swamphead.com/events/?ical=1 |
| bull-calendar-lead | 2026-10-17T12:35:59.072Z | 200 | text/html;charset=utf-8 | https://www.thebull-gnv.com/calendar |
| cypress-calendar-lead | 2026-10-17T12:35:59.401Z | 200 | text/html;charset=utf-8 | https://www.cypressandgrove.com/calendar |
| salty-weekly | 2026-10-17T12:38:11.427Z | 200 | text/html; charset=UTF-8 | https://saltydogsaloon.com/ |

## Flyer OCR, local only

Three actual publisher-linked images, checked visually against [manual-review.json](evidence/manual-review.json). Windows.Media.Ocr en-US plus installed OpenCV. Manual crops use explicitly chosen coordinates for one known layout; they are not automatic region detection. No external AI service was called.

| Flyer | OCR UTC | Variant | Pixels | Words | Date candidates | Time/range candidates | Currency candidates | Age candidates |
|---|---|---|---|---:|---|---|---|---|
| pride | 2026-10-17T12:36:58.833Z | original | 2500×3125 | 55 |  |  |  | 18+ |
| pride | 2026-10-17T12:36:58.833Z | contrast | 3200×4000 | 63 | OCTOBER 17 |  |  | 18+ |
| pride | 2026-10-17T12:36:58.833Z | threshold | 3200×4000 | 28 |  |  |  | 18+ |
| pride | 2026-10-17T12:36:58.833Z | manual_schedule_crop | 3250×500 | 6 | OCTOBER 17 | 16-10 PM |  |  |
| pride | 2026-10-17T12:36:58.833Z | manual_offer_crop | 1450×1250 | 24 |  |  |  |  |
| festival | 2026-10-17T12:37:06.141Z | original | 1080×1350 | 36 | October 18th | 1-5pm |  |  |
| festival | 2026-10-17T12:37:06.141Z | contrast | 2160×2700 | 33 | October 18th | 1-5pm |  |  |
| festival | 2026-10-17T12:37:06.141Z | threshold | 2160×2700 | 33 | October 18th | 1-5pm |  |  |
| karaoke | 2026-10-17T12:37:10.275Z | original | 1080×941 | 8 |  |  |  |  |
| karaoke | 2026-10-17T12:37:10.275Z | contrast | 2160×1882 | 7 |  |  |  |  |
| karaoke | 2026-10-17T12:37:10.275Z | threshold | 2160×1882 | 2 |  |  |  |  |

**A candidate is not a verified field.** The pride crop extracted `16-10 PM` from a flyer visibly saying `6-10 PM`; the $10 donation/wristband condition was not recovered. All three flyers omit year. Empty extraction is unknown, never free/all-ages. See [REPORT.md](REPORT.md).

| Flyer request | UTC start | HTTP/error | Format | Exact URL |
|---|---|---|---|---|
| pride: page | 2026-10-17T12:33:34.275Z | 200 | text/html;charset=utf-8 | https://www.fmbrewing.com/event-calendar/pride-party |
| pride: image | 2026-10-17T12:33:34.692Z | 200 | image/png | https://images.squarespace-cdn.com/content/v1/69c5d9f8c17f150b8f1817f8/4c6d074a-a969-437d-b0f2-d72bd2b6c66a/PRIDE-PARTY_4_5.png |
| festival: page | 2026-10-17T12:33:35.053Z | 200 | text/html;charset=utf-8 | https://www.fmbrewing.com/event-calendar/florida-forever-festival |
| festival: image | 2026-10-17T12:33:35.692Z | 200 | image/png | https://images.squarespace-cdn.com/content/v1/69c5d9f8c17f150b8f1817f8/d5d05fd1-8940-4278-9a2d-3a83939c64ea/FNPS_FFF+Flyer.png |
| karaoke: page | 2026-10-17T12:33:36.046Z | 200 | text/html; charset=UTF-8 | https://www.looseys.com/events/karaoke-party/ |
| karaoke: image | 2026-10-17T12:33:36.325Z | 200 | image/jpeg | https://www.looseys.com/wp-content/uploads/2023/07/Karaoke.jpg |

Full OCR is transient child-process output consumed in memory. Saved evidence includes hashes, dimensions, timing, counts and bounded factual tokens/signals only. Original images and OpenCV outputs remain in an ignored local workspace because automatic approval review rejected cleanup, including a narrower named-file attempt, with “blocked by policy.” They were not staged or committed. Publisher asset URLs/hashes provide provenance, not a republication license.

## Breadth-first discovery

| Source | UTC start | HTTP/error | Format | Exact URL |
|---|---|---|---|---|
| salty-dog | 2026-10-17T12:30:45.259Z | 200 | text/html; charset=UTF-8 | https://saltydogsaloon.com/ |
| swamp | 2026-10-17T12:30:46.958Z | 200 | text/html; charset=UTF-8 | https://swamprestaurant.com/ |
| jjs | 2026-10-17T12:30:47.238Z | ROBOTS_STOP | — | https://www.jjstaverngnv.com/ |
| wooly | 2026-10-17T12:30:47.259Z | 200 | text/html;charset=utf-8 | https://www.thetopsecretevents.com/the-wooly |
| bull | 2026-10-17T12:30:47.575Z | 200 | text/html;charset=utf-8 | https://www.thebull-gnv.com/ |
| looseys | 2026-10-17T12:30:47.853Z | 200 | text/html; charset=UTF-8 | https://www.looseys.com/ |
| first-magnitude | 2026-10-17T12:30:48.886Z | 200 | text/html;charset=utf-8 | https://www.fmbrewing.com/ |
| cypress-grove | 2026-10-17T12:30:49.440Z | 200 | text/html;charset=utf-8 | https://www.cypressandgrove.com/calendar |
| blackadder | 2026-10-17T12:30:49.756Z | 200 | text/html; charset=UTF-8 | https://www.blackadderbrewing.com/ |
| swamp-head | 2026-10-17T12:30:50.306Z | 200 | text/html; charset=UTF-8 | https://swamphead.com/ |
| glory-days | 2026-10-17T12:30:50.754Z | 200 | text/html; charset=UTF-8 | https://glorydayspresents.com/ |
| top-tier | 2026-10-17T12:30:51.542Z | ROBOTS_STOP | — | https://toptiermpe.com/ |
| g2-links | 2026-10-17T12:30:51.983Z | ROBOTS_STOP | — | https://linktr.ee/G2_Ent |

Discovery details/feeds/business social links: [discovery.json](evidence/discovery.json). JJ’s failed DNS during robots lookup; Top Tier and Linktree had explicit exclusions. No content requests were sent for these stopped targets. Blackadder/Wooly/Swamp pages loaded but did not yield Event JSON-LD records. No unofficial Instagram requests, login attempts, guest lists or private event data.
