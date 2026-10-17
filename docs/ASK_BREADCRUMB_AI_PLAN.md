# 🍞 Ask Breadcrumb — AI Discovery Engine Implementation Plan

> **Project:** Breadcrumb · SwampHacks XII · University of Florida  
> **Status:** Proposed implementation blueprint; features below are not automatically implemented  
> **Updated:** October 17, 2026  
> **Website:** `leaveacrumb.us`  
> **Tagline:** *Leave a crumb. Spread the word.*  
> **Related docs:** `BREADPASS_AUTH0_PLAN.md`, `TIGER_DATA_PLAN.md`, and the main Breadcrumb app outline

## TL;DR — What we're building

**Ask Breadcrumb is a real-time, conversational campus discovery assistant, not a generic chatbot or an itinerary planner.** It helps a student discover what's happening at UF (and eventually Gainesville) by combining scheduled events, fresh community reports, the student's stated interests, and trustworthy source context.

**Recommended approach:** **One Gemini-powered discovery agent + trusted retrieval tools + structured spatiotemporal filtering + optional hybrid semantic search + deterministic evidence-aware ranking.** This is the strongest *practical* approach for the current product and hackathon constraints, not an assertion that one AI architecture is universally best.

| Decision | Plan |
| --- | --- |
| Core experience | Discover relevant events and live Crumbs; answer follow-up questions; highlight results on the map |
| Primary AI | Gemini for intent interpretation, tool selection when needed, grounded explanations, and optional flyer/caption extraction |
| Data retrieval | PostgreSQL and PostGIS for explicit location, time, category, price, and tag constraints |
| Fuzzy discovery | PostgreSQL full-text search + optional pgvector semantic search; introduce if evaluation shows a clear benefit |
| Ranking | Deterministic rules first; optional LLM reranking among valid candidates later |
| Agent design | **One bounded tool-using agent**, not a multi-agent swarm |
| GraphRAG | Not necessary for MVP; use relationships already modeled in PostgreSQL |
| Source ingestion | Separate pipelines normalize Instagram, GatorConnect, UF Calendar, permitted community sources, and user Crumbs *before* chat queries |
| Tiger Data | Optional tool for **reported** hotspot/activity trends, never proof of crowds or foot traffic |
| BreadPass / Auth0 | Public discovery without login; optional private user preferences and opt-in calendar connectivity later |
| Response format | Concise answer + 1–4 source-linked cards + credibility/freshness labels + View on Map |
| No-results behavior | Admit the gap, then offer nearby or broader **clearly labeled** alternatives without silently breaking user constraints |
| Explicitly not MVP | AI itinerary builder, auto-booking, calendar writing, full GraphRAG, autonomous browsing of social networks at question time |

### The product distinction

- **Map:** “What's happening *where*?”
- **Live Buzz:** “What's been posted recently?”
- **Ask Breadcrumb:** “What's worth discovering *for me, given my situation*?”

A student should not need to know which clubs to search, how to combine filters, or which social account posted a flyer.

---

## 1. Target questions and expected behavior

| Student asks | Ask Breadcrumb should do |
| --- | --- |
| “Any free food near Reitz right now?” | Search active freebie Crumbs near Reitz; favor recent independent reports; show freshness and Loaf status |
| “What's going on tonight?” | Search valid upcoming events + recent event-related Crumbs; identify today in **America/New_York** |
| “I'm into gaming and tech. Anything happening?” | Match interest tags, relevant organizations, and optionally semantically related descriptions |
| “Are there Women in STEM events this week?” | Use explicitly supported **event community tags** and source descriptions; never infer the user's identity |
| “Any bar deals in Midtown today?” | Retrieve sourced promotions **only if available**; do not hallucinate deals, operating hours, prices, or availability |
| “Is Lib West crowded?” | Summarize **recent crowd reports, if any**; lack of reports is not evidence that the library is empty |
| “Where's campus buzzing?” | Optionally query Tiger Data for recent **report-density hotspots** and link the contributing records |
| “Which of those is closer?” | Reuse the prior cited result set and a chosen/reference location; compute distance, not invent travel time |
| “Nothing near me?” | Offer to expand time, radius, interests, or price constraints; explain any relaxation |

### Interaction guidelines

1. Answer directly in conversational language, without dumping every database field.
2. Show a small number of cards with event/report title, where, when, source, age, and why relevant.
3. Clearly distinguish **official listing**, **organization/business announcement**, **community Crumb**, and **Full Loaf (community corroborated)**.
4. Every card opens the existing map or event sheet; a chat result is *not* just plain text.
5. Maintain conversational constraints across follow-ups: “tonight” → “which are free?” → “show the closest one.”
6. Give users a way to **Clear search context**. Never unexpectedly persist sensitive location or personal questions.

---

## 2. System architecture

```text
     Instagram / club posts    GatorConnect / UF feeds      Permitted local sources
                \                    |                         /
                 \                   |                        /
                 Source-specific collectors (independent of chatbot)
                                      |
                  Parse / normalize / resolve time and venue
                  Enrich interest tags; deduplicate; attribute
                                      |
                  Canonical event + source evidence tables
                                      |
                 Supabase PostgreSQL + PostGIS (+ pgvector optional)
                         |                          |
                  Current Crumbs               Events / clubs / venues
                         |                          |
                         +------------+-------------+
                                      |
  Student question -> POST /api/ask -> Gemini discovery controller
                                      |
                   Allowed tools / validated query contracts
                        |                |             |
                Event search       Crumb search     Place resolver
                        |                |             |
                        +----------+-----+-------------+
                                   |
                   Hard-constraint filtering + relevance ranking
                                   |
                          Server-verified result IDs
                                   |
                  Gemini concise grounded explanation
                                   |
                      Response text + structured cards
                                   |
                      Ask UI <-> Mapbox map selection

      Optional later:
      Tiger Data -> historical activity tool / hotspot summaries
      Auth0 Token Vault -> authorized Google Calendar free/busy tool
```

**Separation of concerns:** The ingestion system does the scraping/feed parsing, extraction, deduplication, and location resolution on its own schedule. **Chat does not scrape Instagram or fetch Yik Yak live for each prompt.** It queries vetted, normalized records.

### Existing stack to preserve

- **Frontend/backend:** Next.js App Router, React, TypeScript, Tailwind, Vercel.
- **Primary data:** Supabase PostgreSQL, PostGIS; Supabase Realtime for Crumb changes.
- **AI:** Gemini, through **server-side** calls only.
- **Maps:** Mapbox.
- **Optional:** `pgvector`, Tiger Cloud, Auth0/BreadPass.

Do not replace the current stack just to adopt a trendy AI framework. Begin with the installed Gemini SDK and a well-defined server tool layer. An orchestration framework or MCP server is optional only if it solves a demonstrated integration problem.

---

## 3. Data preparation: the real foundation

### A. Distinguish events, reports, and evidence

These are **not interchangeable**:

- **Scheduled event:** Has a source-supported date/time, venue, organizer, and link (possibly missing some optional fields).
- **Community Crumb:** Time-stamped firsthand report, active or expired, with corroboration/dispute state.
- **Source evidence:** The original feed listing, Instagram post, flyer, or authorized URL supporting an event record.
- **Activity aggregate:** A count/trend derived from reports. Not direct evidence of foot traffic.

One event may have several source records (e.g., GatorConnect plus an Instagram flyer). **Deduplicate carefully** by organizer, title, date, place, and source identifiers, retaining all provenance; do not blindly merge events with similar names.

### B. Normalized fields (adapt existing schema, don't replace it)

The app outline already includes `club_events`, `crumbs`, `places`, and community/interest taxonomies. Extend only as necessary:

```ts
interface DiscoverableEvent {
  id: string;
  title: string;
  description?: string;
  organizer?: string;
  startsAt: string;                // source-backed ISO timestamp
  endsAt?: string | null;
  venueName?: string | null;
  placeId?: number | null;
  coordinates?: { lat: number; lng: number } | null;
  communityTags: string[];         // event focus, not attendee identity
  interestTags: string[];
  priceType: 'free' | 'paid' | 'unknown';
  priceAmount?: number | null;
  sourceType: 'uf_official' | 'organization' | 'business' | 'community';
  sourceLinks: string[];           // permitted attributable references
  lastSourceUpdateAt?: string;
  isDemo: boolean;
}

interface DiscoverableCrumb {
  id: string;
  title: string;
  category: string;
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'resolved' | 'expired' | 'removed';
  location: { lat: number; lng: number };
  loafState: 'crumb' | 'rising' | 'full_loaf' | 'stale' | 'toast';
  confirmCount: number;
  disputeCount: number;
  isDemo: boolean;
}
```

These are **conceptual DTOs**, not SQL migrations or a demand to rename existing database fields. Treat a missing price as **unknown**, never `$0`. Treat a missing venue as **unresolved**, never assign a guessed pin. Preserve the event's original timezone/date semantics.

### C. Where Gemini helps during ingestion

- Extract structured event fields from captions, flyer images, and publicly accessible listing content.
- Suggest controlled interest tags; preserve evidence for why a tag was assigned.
- Suggest community tags **only when the event/organizer explicitly identifies the focus**.
- Help identify possible duplicates, followed by deterministic checks or a review queue.
- Suggest a known UF venue match; accept geocoding only at adequate confidence, or leave location unresolved.

**Social integration boundary:** An experiment retrieving data from Instagram or Yik Yak does **not** by itself mean that production reuse, retention, rehosting, or user-facing republication is authorized. Ingest only from sources and within terms/permissions that support the intended usage. Do not turn vague social posts into precise individual-location reports. Avoid sensitive sightings and identifiable-person amplification.

### D. Freshness

- **Crumbs:** Query active statuses, require `expires_at > now()`, and include recent timestamps. Do not recommend removed/expired reports as current.
- **Events:** Compare user-requested window against actual `starts_at`/`ends_at`; “tonight” is local ET, not UTC calendar day.
- **Promotions/deals:** Require a source-supported validity window or clearly state that the current deal has not been confirmed.
- **Source sync:** Keep `last_synced_at` and ideally `last_verified_at` distinct from when the event was scheduled.

---

## 4. How discovery works: three complementary mechanisms

### Mechanism 1 — Structured spatiotemporal queries (P0)

Use SQL/PostGIS for facts the model must **not guess**:

- Location: campus building alias, radius, visible map bounds.
- Time: now, today, tonight, weekend, between classes.
- Event status: upcoming, in progress, concluded.
- Crumb status: active, expired, resolved, disputed/removed.
- Category, controlled interest/community tags, confirmed free/paid status.
- Distinct source classifications and corroboration labels.

**Hard constraints always win.** If the user requires “free,” do not substitute unknown-price events as free. If they require “within 10 minutes' walk,” a geodesic radius is not proof of walking time; either call a routing service or state that distance is approximate.

### Mechanism 2 — Text + semantic retrieval (P1)

Use keyword search for “ACM,” “Reitz,” and exact club names; embeddings for “meet other programmers” matching a “software engineering networking mixer.”

Recommended progression:

1. Start with normalized taxonomy tags, SQL filters, and PostgreSQL full-text search.
2. Add Gemini embeddings of compact event context (title, organizer, description, interests, venue), stored in `pgvector`.
3. Retrieve from both search strategies; combine with reciprocal-rank fusion or a simple normalized score.
4. Re-apply hard constraints to the combined candidate pool.
5. Measure whether hybrid search improves relevant-event recall before adding complexity.

**Embedding the entire constantly changing Crumb feed is not a hackathon requirement.** Structured filters are sufficient for many time-sensitive reports.

### Mechanism 3 — Bounded Gemini tool use (P0/P1)

Gemini interprets the question and chooses from a small, read-only tool catalog. The backend validates tool arguments and performs authorized queries. The model does **not** get arbitrary SQL access or the Supabase service-role secret.

One tool-using agent is enough; use a max number of tool rounds and a server-side timeout. Complex search/planning frameworks, GraphRAG, and multiple coordinating agents are **not justified without measured benefit**.

---

## 5. Gemini tool contracts

**Proposed initial tools** — map these to existing API/repository conventions:

| Tool | Inputs | Returns | Priority |
| --- | --- | --- | --- |
| `resolve_place` | place text | Canonical UF place, aliases, coordinates | P0 |
| `search_events` | time window, tags, keywords, location/radius, `freeOnly?` | Source-linked event IDs and factual metadata | P0 |
| `search_crumbs` | category, location/radius, freshness, loaf filter | Active Crumb IDs, age, state, evidence metadata | P0 |
| `get_event` / `get_crumb` | validated record ID | Full public details for one record | P1 |
| `get_reported_hotspots` | zone, time window | Tiger Data report-density aggregates, not crowds | P2 |
| `get_calendar_freebusy` | opt-in authorized user + time range | Busy/free intervals, no private titles | Stretch |

**Tool boundaries:**

- Explicit maximum radius, date horizon, result count (e.g., 10–20/tool), pagination rules, and allowed category/tag values.
- Validate all datetime and geospatial inputs server-side.
- Reject requests for private identities, precise user locations, raw tokens, or unauthorized records.
- Return evidence as structured records that include stable IDs, timestamps, and source classification.
- Source citations must be built from **IDs actually returned by these tools**, not model-generated URLs.
- Server enforces a max of ~2–4 tool rounds for normal prompts (adjust after measuring).

### Example internal search input

```json
{
  "timeWindow": { "start": "2026-10-17T18:00:00-04:00", "end": "2026-10-17T23:00:00-04:00" },
  "nearPlace": "Reitz Union",
  "radiusMeters": 1500,
  "interestTags": ["technology", "gaming"],
  "communityTags": [],
  "priceType": "free",
  "limit": 10
}
```

**Example only:** The time, records, and constraints above are illustrative, not retrieved facts.

### Fast path versus deep path

- **Fast path:** “Free food at Reitz?” → parse constraints, call relevant structured search, return results. Minimize token use and latency.
- **Deeper path:** “I like robotics and want to meet people tonight; what looks good?” → combine text/tag/semantic results, compare candidates, explain matches.

One server route can implement both. Use a light intent classifier or Gemini structured output to route; avoid a second full LLM call if unnecessary.

---

## 6. Ranking: make recommendations genuinely useful

**Two-stage recommendation system:**

1. **Candidate generation:** Fetch a broad but bounded list of records using tags, semantic/keyword matching, location, and time.
2. **Filtering and ranking:** Remove impossible/invalid candidates; score remaining candidates; show 1–4 strong results.

Factors to consider (not probabilities of factual truth):

| Signal | Role |
| --- | --- |
| Matches user's stated interests/community-event focus | Relevance benefit |
| Event is within requested time window | Mandatory for hard time constraints |
| Distance from explicit or consented origin | Preference; only use verified coordinates |
| Recent Crumb confirmation | Helps assess *freshness* of eyewitness reporting |
| Report status/expiration | Exclude stale, removed, expired, resolved as “currently happening” |
| Source provenance | Disclose whether official, organizer-posted, business-posted, or community-sourced |
| Strong explicit free/paid evidence | Meets price constraints; unknown does not count as free |
| Duplicate source mentions | Helps identify the same event, **not** a popularity vote |

A prototype may use fixed transparent weights, but keep the formula configurable and evaluate it. **Do not convert confirmation counts into “90% true” or assume a popular hotspot is crowded.**

**Privacy and fairness:** Community tags describe *events*, not user identity. Never infer protected personal traits or recommend sensitive sightings about named individuals. No user profiling from Yik Yak posts.

---

## 7. Empty results and graceful discovery fallback (must-have)

The assistant must avoid the two common failures: **hallucinating results** and **pretending there is nothing to do because the exact query returned zero records**.

### Desired copy

> “I couldn't find any confirmed free-food reports near Reitz in the last hour. That doesn't necessarily mean there aren't any. Want me to show nearby giveaways or upcoming free events instead?”

### Fallback policy

1. Retry exact filters with a different allowed retrieval strategy (e.g., keyword + semantic search), without dropping hard constraints.
2. If still empty, report the gap precisely: **no matching reports in our current data**, not “nothing is happening.”
3. Offer a small set of **labeled alternatives**, ideally asking permission before changing a hard constraint:
   - Expand area from Reitz to more of UF.
   - Expand “right now” to the next two hours.
   - Relax an *interest preference*, not a hard budget requirement.
   - Show related upcoming events as a separate section with explicit timing.
4. Never silently substitute paid events for “free,” expired reports for “active,” or general venue popularity for verified live activity.
5. If no data supports even alternatives, say so and suggest checking the map/Live Buzz or leaving a Crumb; do not fabricate records.

**Example distinction:** “No recent reports that Lib West is crowded” ≠ “Lib West isn't crowded.”

---

## 8. UI and response contract

**Main navigation:** Map · Live Buzz · **Ask** · Radar, with floating **Drop a Crumb** action.

### Ask screen

- Welcoming hero: “What's happening around campus?”
- Suggestion chips: “Free food near me,” “What's happening tonight?”, “Events for me,” “Where's campus buzzing?”
- Stream short answer text; show cards once structured results are ready.
- Return **structured event/Crumb IDs** that the client can use to open map pins; never parse invented place coordinates out of generated prose.
- Every card displays **source + time/freshness + place + verification/provenance** and **why it matches**.
- Include a “View on Map” action that selects/highlights the same map records. Use existing Mapbox behavior.
- Support follow-ups; provide “Clear chat” and “Clear filters” actions.
- Distinguish demo data visibly from authentic records.

### Suggested `POST /api/ask`

Request (concept):

```ts
interface AskRequest {
  message: string;
  conversationId?: string;         // ephemeral session key if needed
  recentTurns?: { role: 'user' | 'assistant'; text: string }[];
  selectedFilters?: {
    categories?: string[];
    interestTags?: string[];
    communityTags?: string[];
  };
  mapContext?: { center?: { lat: number; lng: number }; zoom?: number };
  coarseUserLocation?: { lat: number; lng: number } | null; // opt-in only
}
```

Response (concept; can stream text plus final structured metadata):

```ts
interface AskResponse {
  answer: string;
  cards: Array<{
    kind: 'event' | 'crumb';
    id: string;                    // verified against returned DB records
    whyMatched: string;
  }>;
  appliedConstraints: Record<string, unknown>;
  alternativeConstraints?: Record<string, unknown>;
  dataFreshnessNote?: string;
  suggestedFollowUps?: string[];
}
```

Do not include private account identifiers, source access tokens, or sensitive social metadata in returned records. If a map view lacks coordinates, show the event in list/cards rather than inventing a pin.

### Conversation state

- Keep only the recent turns and normalized constraints needed for the active session.
- Follow-ups modify only the named constraint; e.g. “make it free” retains earlier location and time.
- Explicitly allow users to clear remembered chat context and linked preferences.
- Avoid persisting raw precise locations, emails, calendar details, or third-party personal content in logs.
- Review any Gemini server-managed state and retention configuration before enabling it with sensitive user context.

---

## 9. Optional connections to other Breadcrumb features

### Tiger Data: real-time *reported* activity

Once `TIGER_DATA_PLAN.md` is implemented, expose `get_reported_hotspots()` for questions such as:

- “Where has the most activity been reported during the past hour?”
- “What changed near Turlington since lunchtime?”

The tool reports **Crumb concentration/trends**, not measured human crowds, attendance, or event quality. Do not treat ten confirmations of one Crumb as ten independently geolocated posts. Do not confuse a visual bread-themed hotspot/loaf with one report's **Full Loaf corroboration** state.

### BreadPass + Auth0: user-selected preferences

- **P0:** Public chat; no sign-in needed.
- **Later:** Users may save favorite interests or followed locations after BreadPass sign-in.
- **Stretch:** Google Calendar free/busy via opt-in connected account / Auth0 Token Vault, as documented in `BREADPASS_AUTH0_PLAN.md`.
- **Future only:** “Add this event to my calendar” requires a separate explicit write permission and user confirmation. Never schedule events automatically as a side effect of chatting.

### Mapbox

- A click on a card opens/highlights its linked pin.
- If you later answer “10-minute walk,” use actual routing/isochrone data before making travel-time claims.
- No multi-stop itinerary planner required for the MVP.

---

## 10. Suggested repo structure

Follow existing repository conventions; this is a reference layout, not a mandate to reorganize working code.

```text
src/
  app/
    api/
      ask/route.ts                    # Server request/streaming
  lib/
    ai/
      ask-agent.ts                    # Gemini control + tool loop
      intent.ts                       # Query interpretation / constraints
      prompts.ts                      # Safety + grounding instructions
      ranking.ts                      # Transparent ranking
      response-schema.ts              # Validated card/answer DTOs
      tools/
        search-events.ts
        search-crumbs.ts
        resolve-place.ts
        get-details.ts
        get-reported-hotspots.ts       # P2 optional
    search/
      event-search.ts                 # SQL + tags + optionally pgvector
      crumb-search.ts                 # PostGIS active/TTL queries
      dedup.ts                        # Existing ingestion pipeline or shared logic
  components/
    ask/
      AskChat.tsx
      ResultCard.tsx
      SuggestionChips.tsx
      EmptyState.tsx
      ViewOnMapAction.tsx
  tests/
    ask/
      evaluation-cases.json
      retrieval.test.ts
      grounding.test.ts
      followups.test.ts
      fallback.test.ts
```

Implement tool functions as ordinary TypeScript service methods; don't create separate microservices for every tool. Keep API credentials and privileged DB access server-side.

---

## 11. MVP development sequence

### P0 — Working discovery end-to-end

- [ ] Identify live/seeded normalized event records with source links and valid time/place fields.
- [ ] Read current active Crumbs through existing Supabase queries.
- [ ] Implement `resolve_place`, `search_events`, `search_crumbs` with strict filtering.
- [ ] Implement `POST /api/ask` using a current supported Gemini model/SDK and read-only tool calls.
- [ ] Validate all tool args, source IDs, result counts, timezones, and rate limits.
- [ ] Return short **grounded** responses with 1–4 server-verified citation cards.
- [ ] Show card → open/highlight correct Mapbox marker.
- [ ] Include **no-results + useful nearby alternatives** behavior.
- [ ] Test on mobile and desktop.

**P0 done when:** A live Crumb posted on phone A becomes discoverable in Ask on phone B, while expired/deleted Crumbs do not appear as active and every displayed card resolves to a real record.

### P1 — Useful personalization, not overengineering

- [ ] Add controlled community and hobby/interest filtering to event retrieval.
- [ ] Add keyword search and, if beneficial, embeddings + pgvector hybrid search.
- [ ] Use deterministic evidence-aware ranking and “why this matches” explanations.
- [ ] Preserve time/location/price filters across follow-up questions.
- [ ] Add optional preferences stored locally or behind BreadPass consent.
- [ ] Add concise stream responses and polished source/freshness UI states.

### P2 — Differentiation if P0/P1 are stable

- [ ] Add Tiger Data tool for recent hotspots and change-over-time summaries.
- [ ] Add organizer/event/venue relationship lookups if real queries need multi-hop logic.
- [ ] Add optional authorized Google Calendar *free/busy* to filter discovery suggestions.
- [ ] Add measured semantic reranking if it improves evaluation results.

### Future, outside hackathon

- [ ] Write-to-calendar after explicit approval and separate OAuth scopes.
- [ ] Venue partnerships and sourced, frequently validated promotions.
- [ ] More nuanced personalization with consent.
- [ ] Planning and multi-stop itineraries **only if** users ask for them.
- [ ] Scale experiments for high-volume campus data and sophisticated abuse controls.

---

## 12. Testing and evaluation (essential for Gemini judges)

Create `tests/ask/evaluation-cases.json` with **25–30 realistic queries**, including:

1. Exact club name and exact building search.
2. Synonyms (“software dev” vs. “coding club”).
3. “Tonight” across the local midnight boundary.
4. “Free only” with an unknown-cost listing present.
5. No coordinates or unresolved venue.
6. Expired, removed, or resolved Crumb present in database.
7. Same event appearing in Instagram and a university feed.
8. Community tag matching an event rather than inferring user demographics.
9. “Is Lib West packed?” with zero fresh crowd reports.
10. A follow-up that only changes radius, budget, or time.
11. No relevant data → graceful fallback.
12. Malicious text embedded in a third-party source trying to instruct the assistant.
13. Fake/permitted synthetic records clearly labeled as demo data.
14. User asks for precise whereabouts of a private individual → refuse to reveal/amplify tracking.

Track: **retrieval relevance, hard-constraint violations, citation validity, freshness correctness, fallback usefulness, response time, and cost per query**. Benchmark simple structured search against hybrid search and the full agent before claiming the latter improves accuracy.

**Security:** Treat third-party text as untrusted data, never as instructions. Validate output cards against allowlisted IDs, suppress private fields, rate-limit public `/api/ask`, and cap token/tool/query usage to prevent abusive costs. Dangerous emergency questions should point to official resources, not imply community Crumbs replace emergency alerts.

---

## 13. Ideal live judge demo (60–90 seconds)

**Setup:** Two browsers/phones, one server-linked demo dataset, one permitted event/flyer source, the live map, and Ask Breadcrumb. All synthetic records are **visibly labeled DEMO**.

| Time | Judge sees | What it proves |
| --- | --- | --- |
| 0:00–0:10 | Show Instagram/club flyer or normalized source record; an event appears with proper tags and attribution | Multimodal extraction + source normalization |
| 0:10–0:25 | Ask: “I'm into tech and want something free near Reitz tonight.” | Gemini understands interests, cost, location, time |
| 0:25–0:40 | Two source-backed recommendation cards appear; select one to highlight its map pin | Structured retrieval + evidence-linked UI |
| 0:40–0:55 | Another phone drops a fictional free-pizza Crumb; ask “Any free food near there right now?” | Live, independent community data reaches the agent |
| 0:55–1:05 | Ask “Which of those is closer?” or “What else is nearby?” | Conversational follow-up + geographic context |
| 1:05–1:20 | Ask something with no matches; assistant admits the gap and offers to expand radius/time | Grounding + graceful fallback; no hallucinations |
| 1:20–1:30 | **If ready:** “Where has report activity increased?” with Tiger-backed hotspot evidence | Optional time-series insight integration |

### 10-second judge pitch

> “Breadcrumb's Gemini agent doesn't just chat about campus. It interprets what a student wants, searches our real-time UF reports and event sources with time and location constraints, and returns source-backed recommendations they can jump to on the map.”

### 30-second technical explanation

> “We ingest and normalize public event information separately, then combine it with live Crumbs in Supabase. Gemini interprets the question and calls a small set of validated discovery tools. PostGIS enforces location and time constraints; tag and optional semantic retrieval find relevant opportunities; deterministic ranking checks freshness and source quality. Gemini explains the matches, and the frontend renders cards using verified database IDs. If nothing matches, it says so rather than inventing events.”

**Backup:** Use a deterministic, visibly labeled synthetic demo dataset and a prechecked recorded walkthrough if Wi-Fi, data-source access, or model latency fails. Do not pretend seeded records are real student activity or use cached answers that misrepresent a live query as live retrieval.

---

## 14. Decisions settled vs. questions still open

### Settled

- Discovery-first, **not** itinerary-first.
- Gemini is the conversational reasoning layer, not the system of record.
- One bounded agent; small trusted tool catalog.
- Existing Supabase/PostGIS is the retrieval backbone.
- Hybrid semantic retrieval is **optional** until it demonstrates benefit.
- Hard constraints + evidence-aware ranking matter more than AI buzzwords.
- Answers cite real records and open the matching map pins.
- Helpful nearby alternatives and honest no-results answers are first-class product behavior.
- Tiger Data and calendar are useful **extensions**, not blockers.

### Refinable after first implementation

- Exact Gemini model/SDK endpoint and streaming strategy (choose from currently available stable options).
- Whether user intent needs a separate structured-output model call.
- Relative keyword/semantic/relevance score weights.
- Embedding model/dimensions and pgvector index, if needed.
- Tool response result counts, limits, cache TTLs, latency targets.
- Whether chat keeps only local session history or also offers opt-in saved conversations.
- Which external sources have actually cleared access and reuse review.

---

## 15. Helpful primary documentation

- Gemini API function calling: https://ai.google.dev/gemini-api/docs/function-calling
- Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output
- Gemini embeddings: https://ai.google.dev/gemini-api/docs/embeddings
- Supabase semantic and hybrid search: https://supabase.com/docs/guides/ai/hybrid-search
- PostGIS: https://postgis.net/documentation/
- Mapbox GL JS heatmaps and map interaction: https://docs.mapbox.com/mapbox-gl-js/
- Auth0 calendar/identity integration: see `BREADPASS_AUTH0_PLAN.md`
- Tiger Data time-series hotspots: see `TIGER_DATA_PLAN.md`

> **Bottom line:** Build a **campus discovery agent that can explain and show its evidence**, not “RAG because RAG is trendy.” Use the minimum architecture required to reliably answer real student questions today, and progressively add hybrid search, Tiger insights, and optional personalization when they demonstrably help.
