# Instagram Event Discovery — Apify Feasibility Notes

**Project:** Breadcrumb — SwampHacks XII  
**Date:** October 17, 2026  
**Status:** Technical proof of concept succeeded; production access and reliability are **not** validated  
**Suggested repo path:** `research/instagram-apify-discovery.md`

## TL;DR

We tested [Apify's Instagram Scraper](https://apify.com/apify/instagram-scraper) as a way to ingest public Instagram posts for Breadcrumb **without first creating a Meta developer app**. The initial tests succeeded:

1. **Our test account, `@breadcrumb.swax`:** Retrieved its public Instagram test flyer as **1 dataset result**. The exported JSON contains the caption, post URL, timestamp, display image URL, hashtags, account metadata, and other useful fields.
2. **UF ACM / UF Association for Computing Machinery:** Retrieved **3 dataset results** from an unrelated public organization account. This demonstrates a working cross-account *technical test* with this provider; we have not yet verified how consistently it retrieves the newest posts across many accounts.

**Next goal:** Build a curated watchlist of **32+ Gainesville/UF accounts** covering student orgs, bars, nightlife, promoters, dining, and community events. Then test the importer + AI extraction pipeline against representative accounts and posts.

> **Important:** Apify scraping is not equivalent to authorized Instagram API access. Instagram restricts automated data collection without permission, and successful retrieval does not grant rights to republish third-party text or images. Treat this as a research/prototype path; review platform terms, rights, and reliability before production use. Prefer organizer opt-in and official event feeds for durable integrations.

## Why we explored this

Breadcrumb wants to help students discover real events in Gainesville, especially activities that are advertised **only through Instagram posts and flyers**. We originally planned to use Meta's Instagram API, but developer registration was blocked by an account security restriction. We tested Apify as a separate data-source experiment so development could continue.

What we need from a candidate source:

- Who posted it, and a direct link to the announcement
- Post publication time (for freshness/deduplication, **not** necessarily event time)
- Caption and tags
- Flyer/photo/video/carousel media suitable for event-detail extraction
- Enough event evidence to infer **title, calendar date, start/end time, venue, and category**, or flag missing/conflicting details

## Tests completed

| Test | Input | Observed result | What it establishes |
| --- | --- | --- | --- |
| 1 — Controlled post | `https://www.instagram.com/breadcrumb.swax/` | **Succeeded**, 1 dataset result; **17 s**; displayed run cost about **$0.003** | Scraper returned our public Instagram post and structured metadata |
| 2 — Other public account | UF ACM's public Instagram profile | **Succeeded**, 3 dataset results | Scraper could retrieve posts from an account we do not own |

Only **Test 1** has an exported JSON file reviewed in detail. Test 2 is verified from the Apify output screen; export its JSON before making field-level claims about that account.

### Fields confirmed in the Test 1 JSON

| Apify field | Purpose in Breadcrumb |
| --- | --- |
| `id`, `shortCode`, `url` | Stable-ish source identifiers, deduplication, source link |
| `ownerUsername`, `ownerId` | Track posting account |
| `caption`, `hashtags`, `mentions` | Text extraction and tagging |
| `timestamp` | Publication timestamp; compare with ingestion time |
| `displayUrl` | Flyer image for multimodal extraction; **may expire** |
| `type`, `productType`, `childPosts`, `images` | Single-image vs. carousel/reel handling |
| `isPinned` | Recognize special ordering, but do not assume it is present/correct for all posts |
| `alt`, `dimensionsWidth`, `dimensionsHeight` | Extra image metadata |
| `likesCount`, `commentsCount` | Optional engagement metadata; not proof an event is real |

Minimal shape of the actual controlled-test record (long caption and temporary image URL omitted):

```json
{
  "id": "4009943043545358708",
  "shortCode": "DemLfPYEeF0",
  "url": "https://www.instagram.com/p/DemLfPYEeF0/",
  "ownerUsername": "breadcrumb.swax",
  "type": "Image",
  "timestamp": "2026-10-17T13:08:03.000Z",
  "isPinned": false,
  "caption": "GAINESVILLE, WE'RE KICKING OFF THE WEEKEND EARLY ...",
  "displayUrl": "<temporary image URL>"
}
```

The controlled post advertises a **fictional event**, deliberately created for testing. Do **not** import it as a real happening. The flyer also contains a date inconsistency ("Thursday, October 23" in 2026 is actually a Friday); an extraction system should **flag** such conflicts for review rather than silently rewrite them.

### Pinned-post behavior: open question

Instagram profiles can present **pinned posts ahead of newer posts**. When a scraper returns only the first 3–5 posts, it may miss new announcements. The UF ACM results raised this concern, but we have **not** confirmed the pin status/timestamps for each retrieved item from its JSON.

Proposed handling:

1. Fetch a buffer beyond the number of recent posts needed (start by testing **20 results**, not by assuming this guarantees coverage).
2. Dedupe by `platform + post id` and **sort locally by `timestamp`**.
3. Don't automatically discard pinned/old announcements; some may advertise **future** events or semester schedules.
4. Decide event relevance by the **event's actual date**, not just its Instagram publication date.
5. Test whether the scraper reaches newer, non-pinned posts after pinned ones. If not, investigate provider pagination or different discovery methods.

## Proposed technical pipeline

```text
Curated public profiles / approved organizer feeds
    -> Apify fetch (manual/on-demand while prototyping)
    -> Normalize post fields + preserve source attribution
    -> Upsert/dedupe post by platform + post ID
    -> Multimodal AI: caption + available flyer/carousel images
    -> Extract events + confidence + evidence
    -> Validate event date/time and resolve venue/location
    -> Deduplicate against other Breadcrumb/UF event sources
    -> Review or publish as "imported, unverified event"
    -> Link to original announcement
```

Suggested normalized **post** fields:

`source`, `source_post_id`, `source_url`, `account_handle`, `posted_at`, `caption`, `media_type`, `media_urls`, `is_pinned`, `fetched_at`, `raw_payload_reference`, `processing_status`

Suggested extracted **event** fields:

`title`, `description`, `category`, `starts_at`, `ends_at`, `venue_name`, `address`, `latitude`, `longitude`, `age_requirement`, `source_post_id`, `source_url`, `extraction_confidence`, `review_status`, `evidence`

Rules for the event pipeline:

- Use local **America/New_York** time for Gainesville event dates, then convert to timezone-aware storage. A 9 PM–1 AM event ends **the following calendar day**.
- If date, year, venue, or time is missing/ambiguous, mark for review; **don't invent it**.
- Filter expired events from the live map. Historical posts may still be useful as structured test data.
- Label scraped/imported events separately from **live, community-confirmed Crumbs**.
- Avoid showing third-party flyers from temporary media URLs indefinitely; favor links and content uses for which we have rights.
- Keep Apify API credentials **server-side**, in ignored environment files, never in browser bundles or commits.

## Team task: build the first 32-account Gainesville watchlist

**When teammates arrive:** Each of four teammates can identify **8 public accounts** (32 total). Focus on sources that regularly publish **time/place-specific Gainesville or UF events**, not just popular accounts.

| Category | Minimum accounts | Example of content to seek |
| --- | ---: | --- |
| UF student organizations & clubs | 10 | Meetings, workshops, free food, socials |
| Bars / nightlife venues | 6 | DJ nights, themed events, performances |
| Promoters / DJs / event collectives | 4 | Parties, concerts, pop-ups |
| Restaurants / cafés / local businesses | 4 | Specials, openings, community nights |
| Campus-wide / community event pages | 4 | Student-life events, local festivals |
| Arts / music / cultural / other venues | 4 | Shows, exhibitions, community gatherings |
| **Total** | **32** | |

Use the accompanying `instagram-account-watchlist.csv` as the shared tracker. Fill in:

- **Handle + profile URL** (verify it's the actual account)
- **Category, organization/venue name, Gainesville relevance**
- **Recent activity:** last visible post date and whether it regularly posts flyers/events
- **Example post link:** ideally one actual event announcement
- **Priority:** high if it posts frequent time-and-place-specific happenings
- **Owner/teammate, review notes, and test status**

**Selection checklist:** public profile; relevant to UF/Gainesville; active enough to be useful; not a duplicate; content primarily about discoverable events. Don't collect personal/private accounts, login details, private posts, or sensitive student information.

### After the list is ready

1. Select **3–5 representative accounts** spanning different categories.
2. Fetch ~**20 posts each** (within the provider's current limits/budget) and export sample JSON.
3. Verify timestamps, pinned ordering, carousels, media accessibility, data completeness, and recency.
4. Run AI event extraction on at least one **real, upcoming** event per source category where available.
5. Record false positives, date mismatches, missing venues, duplicates, and scraping failures.
6. Only then implement an Apify adapter behind a replaceable `EventSource` interface; keep UF Calendar, GatorConnect, and approved organizer integrations in scope.

## Cost and practical limits

- The account's screenshot showed **$2.70 / 1,000 results** on the Apify Free plan, with a **$5 usage allowance** at the time of testing. The first controlled run showed **about $0.003**.
- Those prices are **observations from October 17, 2026**, not a permanent quote; verify current actor pricing and what counts as a billable result before running larger batches.
- Posts may not be complete or chronologically ordered. Public access can fail, rate-limit, or change unexpectedly. Media links can expire.
- Repeated scraping of public accounts, retention, and redistribution need a platform-terms and rights review before any production use. For the hackathon, keep tests small and focused.

## Outstanding questions

- [ ] Are recent non-pinned posts consistently included after pinned posts when requesting 20?
- [ ] Does `isPinned` reliably match the actual Instagram UI?
- [ ] How are carousel child images and video thumbnails represented in complete JSON?
- [ ] Do stories/reels offer useful event data, and under what conditions?
- [ ] How soon after publication does a new Instagram post appear in Apify results?
- [ ] Can we extract event dates/venues from real campus flyers at useful accuracy?
- [ ] How will we get permission to display event media or integrate participating organizers?
- [ ] How do we distinguish imported announcements from live, corroborated reports?

## Links

- [Apify Instagram Scraper](https://apify.com/apify/instagram-scraper)
- [Breadcrumb controlled test post](https://www.instagram.com/p/DemLfPYEeF0/) — **fictional demo content**
- [UF GatorConnect events](https://gatorconnect.ufl.edu/events)
- [UF Events Calendar](https://calendar.ufl.edu/)

**Bottom line:** The Instagram-to-Breadcrumb ingestion concept is technically feasible in a small test. The next meaningful milestone is validating freshness and extraction quality across a 32+ account watchlist while preserving a path toward authorized, durable data sources.
