# Nightlife, social-life and flyer findings

Research conducted **October 17, 2026, approximately 12:29–12:39 UTC**, following the earlier campus coverage work. No app/backend integration. Exact request times, URLs, status/format, counts, available/missing fields, pagination and bounded returned facts are in [EVIDENCE.md](EVIDENCE.md). This work made no Instagram requests, authenticated social requests, paid model calls or organizer outreach.

**Flyers are a feasible additional input.** I downloaded three actual publisher-linked event images, ran local Windows OCR with OpenCV preprocessing, inspected the images, and compared the results. The strongest immediate nightlife gains also came from ordinary venue/promoter websites and feeds. OCR helps read images after acquisition; it does not solve access to every Instagram post or determine whether an undated offer remains valid.

## Source status

WORKING means relevant real information parsed. PARTIAL means useful facts with meaningful limits. NEEDS ACCESS means missing permitted access/credentials. BLOCKED describes the tested path, not every imaginable authorized method. NOT YET TESTED means discovery without conclusive event retrieval.

| Source | Status | Method / data retrieved | Limitations | Next step |
|---|---|---|---|---|
| Glory Days Presents | WORKING | Public HTML: **76 listings, 28 explicitly Gainesville**, 48 other-city records excluded; dates, venue, presenter, doors time, ticket links | Only first published page; no reliable cost/age on cards; doors time is not show start; inventory not checked | Strong promoter source; bounded ticket details could add age/price with permitted access |
| Swamp Head Brewery | WORKING | Advertised Events Calendar REST, **20 records** on page 1; advertised iCal, **27 components**; food trucks/events, clocks, categories, links | REST reports 34 total/two pages; methods/windows overlap; location absent in sampled feed records; blank price unknown | Useful food, trivia, music and social events; publisher venue context must remain labeled |
| First Magnitude | WORKING | Homepage **8 cards**: two dated food-truck entries and six event cards; **two detail pages** add explicit 2026 dates and schedules | Six homepage event cards omit full date/year; venue supplied from publisher context; one food card already past | Prefer detail dates; do not promise current food stock or free food |
| Loosey's Downtown | WORKING | Two actual detail records: karaoke October 17, 9PM; trivia October 19, 7:30PM; location; karaoke description says free | Recurrent event pages/old flyer; no end times; registration/age not generally established | Useful student social options; preserve current occurrence evidence and source conditions |
| Salty Dog Saloon | PARTIAL | **Seven weekday offer records**, published windows and monetary mentions, including food/drink conditions | Undated recurring claims; no date-specific confirmation; amounts can be discounts, not prices/admission; Monday has two windows | Direct venue confirmation/submission for specials tied to a particular night |
| Three publisher-linked flyers | PARTIAL | Real image retrieval + local OCR; detected event terms, some dates/times and 18+ | Missed small print and some clocks; one incorrect time; no printed year on any image | Field validation, page/caption evidence, and review for uncertain fields before publication |
| The Bull / Cypress & Grove | NEEDS ACCESS | Official pages identify embedded Google calendars | No calendar event records retrieved; Google iCal excluded in previous research; no alternate-host attempt | Organizer-approved Calendar API/export or direct supplied events |
| Blackadder | NOT YET TESTED | Official events page loads, Wix calendar shell and promotion heading found | No conclusive structured event parser; heading alone omits year | Organizer feed/export; limited image/detail investigation if needed |
| The Wooly / Swamp Restaurant | NOT YET TESTED | Official pages load; ticket/venue/business context | No useful Event JSON-LD records in these pages | Use promoter listings now; merchant updates for deals |
| JJ's website lead | BLOCKED | Tested domain failed DNS during robots request (`ENOTFOUND`) | This is the observed hostname/network failure, not a platform prohibition | Verify current official domain or obtain organizer information |
| Top Tier website / G2 Linktree | BLOCKED | Robots exclusions stopped content requests | Search previews do not make them confirmed integration sources | Authorized promoter export/account connection; do not scrape an excluded page via another host |
| Instagram professional accounts | NEEDS ACCESS | Official API documentation reviewed; earlier credential test preserved | No account/app access provided; no Instagram flyer downloaded; some Meta docs unavailable/rate-limited to the research tool | Test one authorized professional account; clarify app permissions and intended reuse |

All successfully fetched venue/feed/image requests were HTTP 200. The working feeds/HTML tests required no key or login. Their content has no comprehensive open reuse license established by this pass; public delivery is not permission to redistribute every description/image or process it with a third-party model. Minimal factual research examples are retained; full payloads and images are not committed.

## Useful real facts

- Glory Days supplies genuine dated local nightlife: two retained examples are at Signal on October 17, with doors at 6PM and 9PM. Its broader listing also contains other Florida cities; filtering the explicit city prevented 48 unrelated results entering Gainesville's set. No claim that every listed ticket is still available.
- First Magnitude's official detail pages establish **October 17, 2026, 6–10PM** for a Pride activity and **October 18, 1–5PM** for a festival. Food-truck cards establish scheduled vendors/hours, not stock, availability or free meals.
- Loosey's provides the current karaoke/trivia occurrence, including address and printed start clock. Its karaoke flyer has a **2023 Last-Modified** image header but is reused on a page presenting an October 2026 occurrence. Image age and event date must remain distinct.
- Salty Dog's Monday food offer has a dine-in condition and a window ending at midnight; its other Monday offers run to 1AM. The parser initially attached the whole shared widget to every day; a targeted correction and regression check now separate adjacent day sections. Raw currency tokens remain distinct from admission cost or a single normalized item price.

The earlier zero “bar specials tonight” result meant the six-feed coverage lab lacked a qualifying dated claim. The seven recurring weekday records improve the research base, but do not retroactively establish a confirmed special on a specific date. Do not count old/undated promos as fresh live observations.

## What the flyer comparison established

The three images were actually retrieved from links in the venues' official pages. Full originals and preprocessing variants were stored only in an ignored local research workspace. Automatic approval review rejected both recursive cleanup and a narrower named-file cleanup with “blocked by policy”; these ignored files remain locally and were not staged/committed. Saved public evidence contains URL/status/time/hash, dimensions, timing, aggregate line/word counts and bounded factual candidates. Full OCR text never goes into evidence. [Manual visual review](evidence/manual-review.json) is labeled separately from OCR; no automated Gemini/vision API was executed.

| Flyer | Original OCR/extractor | OpenCV variants / review | Practical implication |
|---|---|---|---|
| Pride poster | Recognized event/venue terms and 18+; no matching date/time or currency phrase | Contrast recovered October 17. A manually selected schedule crop returned **16–10 PM** instead of **6–10 PM**. A donation/discount-wristband condition remained unread by the extractor | Never silently accept a plausible-looking clock. No automatic admission price from a dollar amount |
| Festival poster | Recovered October 18th and **1–5pm**, plus festival/venue terms | Contrast/threshold variants retained date/time; no year is actually printed | Page supplies 2026 as a separate evidence field; model must not invent a year |
| Karaoke poster | Detected karaoke/free; extractor missed visible **9PM** | Contrast retained free; thresholding lost it. No calendar date or year is printed | More preprocessing is not automatically better. Link to the recurring event's dated occurrence |

Original, contrast and threshold were tested for each image (nine runs), plus two **manually chosen** Pride crops (11 variants total). Crop coordinates reflect inspection of that one layout, not a general poster detector. Typical local OCR child-process times were roughly one to two seconds per variant in this environment, excluding network/download/preprocessing. Three selected images are not a representative accuracy or latency benchmark.

The Pride poster's small amount refers to a **minimum donation for a discounted-drink wristband**, not an established admission fee. The automated extraction missed it. This is exactly why a field needs meaning and evidence, not just a recognized `$10`. An 18+ event condition also does not establish alcohol-service eligibility. Missing age information must remain unknown, not “all ages.”

OpenCV supplied grayscale/contrast enhancement, resizing and thresholding; Windows.Media.Ocr read the pixels. [Microsoft's OCR reference](https://learn.microsoft.com/en-us/uwp/api/windows.media.ocr.ocrengine) documents line/word recognition. [OpenCV's thresholding guide](https://docs.opencv.org/4.x/d7/d4d/tutorial_py_thresholding.html) and [Tesseract's quality guide](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html) support these preprocessing approaches, but do not promise improvement on every design. Tesseract itself was not installed or tested here. Installed Python OpenCV was 4.13.0; no new dependency was needed.

## Getting the image/post legitimately

| Route | Automation potential | What is still needed |
|---|---|---|
| Official website event/feed + linked flyer | High; demonstrated here | Source-specific publishing/AI/image scope, attribution, bounded refresh and cancellation handling |
| Venue/club supplies its original flyer plus event facts | High after intake; avoids needing to retrieve its Instagram copy | Organizer-supplied file and permission; source/date/conditions; a correction mechanism |
| Venue connects a professional Instagram account | Potentially automatic after initial OAuth/app setup | Account/app authorization, appropriate media-read scope and review; test access before claiming it works |
| Other professional-account discovery via Meta's supported APIs | Promising investigation lead | Exact supported fields, app eligibility and use terms not fully verified in this environment; not an unrestricted public-account crawler |
| Student supplies a permitted poster photo | Input processing feasible; acquisition not tested here | Permission/source context; remove unnecessary contacts; verify date/year/eligibility and avoid private-party details |
| Public Instagram link or embed alone | Link/discovery/attribution may help | Does not establish image access, OCR collection rights, caption access or a current event date |

**Initial setup does not imply human approval for every future post.** An authorized account/feed could be read automatically within its permitted scope; uncertain extracted fields may still need review. Simple, reliable website/organizer inputs already cover meaningful nightlife without waiting for universal social-platform access.

Meta's [official Instagram Login collection](https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login) describes professional-account access without a linked Facebook Page; its current basic scope is `instagram_business_basic`. The earlier [credential-gated experiment](../access/README.md) targets a connected organizer's media. Meta's [Facebook Login collection](https://www.postman.com/meta/instagram/folder/9cgqucg/instagram-api-with-facebook-login) describes linked Page/professional-account access and metadata about other professional accounts. That makes Business Discovery worth checking; this pass did not establish exact current media fields/permissions or execute it. Do not confuse the two login setups or assume every public personal account is supported.

Some detailed Meta API pages returned inaccessible/429 through the web tool. No alternate scraping host or repeated challenge attempt was used. The report deliberately does not rely on third-party mirrors, exposed sample tokens, private APIs or old oEmbed-thumbnail tutorials. Stories require separate API/permission verification; arbitrary users' Stories are not a demonstrated input here. No messaging permissions, DMs or account contacts are needed for the flyer experiment.

## A creative, practical direction for Breadcrumb

The most promising combination is an **evidence-backed social calendar**: promoter/venue feeds for planned activities, flyers for missing details, and Crumbs for live observations. Example: a dance party listing establishes the venue/date; the original flyer establishes entry conditions; an organizer update establishes a changed door time; students report the current queue. The app should explain which source supports each field.

For a future extraction experiment, require fields for title, venue, date, doors versus start/end, timezone, admission, offer amount **and its meaning**, age/ID, registration, expiry and source. Each field should carry a short evidence reference plus `unknown`/`needs_review` when absent or contradictory. Posting timestamp, image modification date and event date are separate. Do not turn “free entry before 11 with RSVP” into “free all night,” or a weekly graphic into a dated live offer.

A vision-language model could later compare flyer and caption and propose structured fields, with local OCR as supporting evidence. This pass proves local OCR/preprocessing and public acquisition, **not automated model extraction accuracy**. Keep the original source link, flag inconsistencies, and review important conditions. Do not send a whole account's media/comments to a model when one permitted flyer is enough.

The next highest-value research trial is a small group of willing venues/promoters plus student organizations: one direct feed, one authorized Instagram account and several original supplied flyers, evaluated on the same manually checked fields. Compare correct dates/conditions and correction effort, not just extracted word count. No organizer was contacted and no intake UI/backend was built during this work.

## Retest and validation

All commands are in [README.md](README.md). Working public tests need no credentials. Exact endpoints, pagination and at most two factual examples per experiment are in [records.json](evidence/records.json); flyer observations are in [flyers.json](evidence/flyers.json). Offline verification checks adjacent-day parsing, monetary ambiguity, city-filter arithmetic, OCR provenance/privacy, and script syntax. Shared research HTTP changes add only an optional binary body mode so image bytes are not corrupted; default text behavior and access-policy stops remain in place.

Executed checks passed: `nightlife/verify.mjs` (four minimal evidence files, three matching image hashes, 11 OCR variants, boundary/monetary regressions and PowerShell/Python syntax); `phase2/verify.mjs` (shared robots/time/privacy/credential guards); and `research/verify.mjs` (34 JavaScript files, original evidence/access guards and 173 local documentation links). No application build/test was required or claimed. `git diff --check` passed for tracked changes.
