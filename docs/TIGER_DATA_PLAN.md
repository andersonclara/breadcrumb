# 🍞 Breadcrumb — Tiger Data Integration Plan

> **Status:** Proposed implementation / not yet built  
> **Hackathon:** SwampHacks XII · October 16–18, 2026  
> **Product:** Breadcrumb — *Leave a crumb. Spread the word.*  
> **Main idea:** **Live Hotspots + Campus Rewind**, one location-density feature with a time dimension  
> **Scope note:** This is an implementation reference and demo plan, not a migration order or a claim that the integration works already.

## 1. Executive summary

Breadcrumb is a real-time, community-powered map of what's happening around the University of Florida. Students submit short location-based reports (*Crumbs*) about events, freebies, crowds, and other campus activity. Other students can independently corroborate individual reports through the existing **Crumb → Rising → Full Loaf** trust system.

**Tiger Data's role:** Preserve and summarize how the *density of reported activity* changes by **place** and **time**. **Mapbox** visualizes those summaries as glowing hotspots. **Supabase** remains the operational source of truth for users, Crumbs, votes, report status, and realtime updates.

The experience is deliberately **not a standalone analytics dashboard**:

1. **Live Hotspots:** A warm, animated heat layer on the existing map answers, *“Where are people reporting things right now?”*
2. **Campus Rewind:** The same heat layer can be played back from midnight to now in 20-minute steps, revealing how reported activity moved around campus.
3. **Optional Ask Breadcrumb connection:** Gemini can answer questions about *reported* activity and changes using grounded Tiger Data queries.

**User value:** Spot areas worth exploring without opening every pin; catch up on how campus activity changed; tap a glowing area to see which actual Crumbs contributed. Hotspots are **not** a measurement of foot traffic or proof an event is happening.

## 2. Product decisions agreed so far

| Decision | Chosen default | Notes |
|---|---|---|
| Heat signal | **Density of independent Crumbs near a location** | Count distinct eligible reports, not the number of votes |
| Visual identity | Crumbs build toward a **bread/loaf-themed hotspot**; glow grows cream → toasted gold → coral/red | Fun, distinctly Breadcrumb, not a Snapchat clone |
| Current activity window | **Last 60 minutes** | Stronger weight for recent reports; older reports fade |
| Rewind range | **Start of today's local calendar day → current time** | America/New_York; midnight starts with an empty baseline in the prototype |
| Rewind step | **20 minutes per keyframe** | Animations interpolate between frames for visual smoothness |
| Analytics granularity | Suggested **5-minute internal time buckets** | Distinct from 20-minute UI steps; leave adjustable |
| Operational database | **Supabase PostgreSQL** | Auth, reports, status, moderation, Realtime |
| Historical/aggregation database | **Tiger Cloud / Tiger Data** | Activity history, hypertables, time buckets, continuous aggregates |
| Visualization | **Mapbox GL JS** | Heatmap rendering, crumb pins, and optional loaf icon overlays |
| Demo volume | Deterministic **synthetic/seeded** reports | Explicitly marked as simulated, isolated from genuine reporting |
| Initial geography | University of Florida + selected Gainesville zones | Tune grouping precision after visual testing |

**Refinable decisions:** Geographic radius/cell size, visual thresholds, decay formula, aggregation/refresh frequency, retention, and whether to run Tiger as a separate service are all defaults, **not finalized architecture**.

### 2.1 Two different meanings of “loaf” — do not confuse them

- **Individual Full Loaf = corroboration status.** One particular Crumb has received enough independent confirmations. This is about the *trust indicator for that report*.
- **Loaf-shaped hotspot / “Loaf Zone” = spatial report density.** Many distinct Crumbs were posted near each other recently. This is about *reported activity volume*, **not verification**.

We can animate small Crumb-like specks visually gathering into a loaf icon atop an intense hotspot. In labels and tooltips, prefer **“Buzzing near Reitz · 12 recent Crumbs”** rather than **“Verified Full Loaf zone.”** If the phrase *Loaf Zone* confuses users, change only the UI label; the underlying concept remains the same.

## 3. The user experience

### Live Hotspots

- A toggle on the existing map: `Crumbs | Hotspots` (or a discreet flame/bread icon). Avoid a new navigation tab.
- Hotspot areas are faint with few recent posts, brighter with more independently submitted posts, and gradually transition to reddish when dense.
- At high density, a small **loaf silhouette/marker** can appear near the hotspot center; individual Crumb pins remain accessible when users zoom or toggle layers.
- Tapping a hotspot shows the approximate campus zone, **count of contributing recent Crumbs**, latest observation age, categories, and a “View Crumbs” action.
- Optional filters reuse map filters (Events, Freebies, Crowds & Lines, etc.) so the heat changes with the selected type.
- Newly submitted Crumbs affect the live hotspot without a page refresh, subject to aggregation freshness. Explain any delay if backend summaries refresh periodically.

### Campus Rewind

- From the map's Hotspots mode, tap `Rewind` / `See today's Crumbs`.
- The timeline starts at **12:00 AM** local campus time with **zero day-scoped activity** in the prototype.
- Move in **20-minute increments**: 12:00, 12:20, 12:40, 1:00 … up to the current time. The last partial segment may end at the actual present time.
- At each timestamp **T**, render the hotspot density from eligible Crumbs reported during **[max(local midnight, T − 60 min), T]**, with age-based fade as evaluated *at T*.
- This is **not a running accumulation from midnight**. Old contributions must fade or disappear as the playback advances, or every hotspot would only get stronger all day.
- During automatic playback, tween color/opacity/weights between successive 20-minute frames (e.g. 300–700 ms per transition). The underlying snapshots are 20 minutes apart; the animation is visually smooth without inventing intermediate events.
- The date, time, and `Historical activity · not live` label stay visible. `Jump to Now` exits rewind.
- Tap any historical hotspot to inspect contributing records that were active/visible at that timestamp and are still permitted to display.

**Midnight edge case:** The chosen **empty-midnight baseline** means the *demo's day-scoped replay* intentionally excludes previous-day reports, even though a true rolling 60-minute *live* view could include posts from 11:30 PM the previous day. For MVP consistency, either apply the same midnight clip to Live mode, **or** explicitly label Rewind as *today-only*. Choose one during implementation and document the edge case. Do not silently claim a perfect historical copy when the models differ.

## 4. What creates heat?

**Basic product rule: density of distinct, eligible Crumbs near a place over the last 60 minutes.** We deliberately do **not** let one popular Crumb create the equivalent of 100 separate reports just because it has 100 confirmations.

For a prototype, each eligible Crumb supplies one weighted contribution:

```text
age_minutes = minutes_between(frame_time, crumb_created_at)
if age_minutes < 0 or age_minutes > 60: weight = 0
else: weight = max(0, 1 - age_minutes / 60)   # simple linear fade; tune later

hotspot_density(zone, frame_time) = sum(weight for distinct eligible Crumbs in that zone)
```

A piecewise fade or exponential decay could later replace the linear formula. A single account should not be able to manufacture a hotspot by rapidly submitting repeated nearly identical reports; apply rate limiting, duplicate detection, and optional per-account contribution caps.

**Illustrative visual bands (tune with simulation):**

| Density (illustrative) | Visual | Meaning |
|---|---|---|
| Very low | No glow / faint cream | Little reported activity |
| Low–medium | Toasted gold halo | Several recent reports nearby |
| High | Warm orange/coral halo | Concentrated recent reports |
| Very high | Red/orange halo + loaf-shaped overlay | Many distinct recent reports nearby |

Avoid fixed public claims like “100 people are here,” “crowded,” or “safe.” The visual means **many reports here**, nothing more.

### Which reports count?

**Proposed default:** Include campus discovery categories such as Events, Freebies, and Crowds & Lines. Treat construction/closures/hazards as separate map pins or overlays, not as cheerful social hotspots. **Exclude person-related Sightings** from hotspot amplification by default because of the potential to expose or target an individual. Revisit category policy with the team.

- Use only location-specific reports with sufficient reliability for approximate zone placement.
- Exclude removed, disallowed, and spam/duplicate reports; resolved and expired reports cease contributing according to lifecycle rules.
- Imported official calendar listings **do not themselves count as real-time posts**; show distinct event pins. If users add independent live Crumbs about a scheduled event, those observations can contribute.
- Yik Yak posts and Instagram content do **not** become precise heat points just because they mention a campus location. Require permitted data use, appropriate location quality, and a separate provenance policy.
- For privacy, render generalized hotspot centers/zones rather than using heat to reconstruct someone's location or travel history.

## 5. Architecture and responsibilities

```text
                             Breadcrumb UI (Next.js + Mapbox)
                                    |                |
                  Current Crumbs, map data       Hotspot / rewind queries
                                    |                |
                               Supabase         Next.js server API
                             Postgres/Auth          |
                             Realtime/RLS           v
                                    |             Tiger Cloud
                                    |        time-series activity events
                              Write API ----->   hypertables + aggregates
                            (events emitted)         |
                                    |                v
                            Outbox / retry      GeoJSON density summaries
                            (recommended)         |
                                    +----------------+
                                           |
                                Mapbox glowing heat layer
```

### Clear separation

- **Supabase:** Current business truth (report, author account mapping, verification/corroboration, expiration, moderation, notifications).
- **Tiger Data:** Timestamped events and fast analysis by time × location. Handles history, time buckets, rollups, trend queries. Do not store student email addresses, phone numbers, private handles, or post text unnecessarily.
- **Mapbox:** Draws geographic intensity and optional bread/loaf-themed overlays. Tiger Data doesn't render the map.
- **Gemini:** Optionally asks server-approved analytics tools for historical summaries. It must not invent reported events or claim hotspots represent crowds.

### How writes reach Tiger

**Smallest hackathon path:** When the server accepts a new Crumb, write it to Supabase; enqueue or emit an idempotent activity record to Tiger using a server-side operation. If Tiger is temporarily down, the Crumb must still post normally and the analytics write must be retryable.

**Stronger future path:** Transactional outbox in Supabase, plus an idempotent background worker that retries delivery. Use a stable event ID so retries do not double-count. Avoid direct client writes to Tiger Cloud; credentials stay server-only.

For bans, moderation removals, changes to post eligibility, or privacy takedowns, update/retract associated heat contributions and historical display. A historical map must **never resurrect content removed for harassment/privacy reasons**. Materialized aggregates may require invalidation/refresh or compensating records; budget for this as a known engineering decision.

## 6. Proposed data model (illustrative, not production-ready DDL)

### Activity record

```ts
export type BreadcrumbActivityEvent = {
  eventId: string;           // stable idempotency key
  crumbId: string;           // internal cross-reference, never shown publicly
  occurredAt: string;        // UTC event timestamp
  receivedAt: string;        // UTC ingestion timestamp
  eventType: 'created' | 'resolved' | 'expired' | 'removed';
  category: 'event' | 'freebie' | 'crowd' | 'construction' | 'hazard' | 'sighting';
  zoneId: string;            // generalized UF zone or spatial cell
  latitude?: number;         // optional generalized heat coordinates
  longitude?: number;
  isEligibleForHotspot: boolean;
  dataKind: 'real' | 'synthetic';
  simulationRunId?: string;  // track and cleanly remove a demo dataset
};
```

For a more precise, independent-contribution metric, dedupe by `crumbId` and optionally cap near-duplicates per author **in the trusted application layer**. Do not export identities to the analytics layer merely to calculate heat.

### Tiger-side tables and queries

Conceptual tables:

```text
activity_events (time-series hypertable)
  occurred_at, event_id, crumb_id, event_type, zone_id,
  category, generalized_coordinates, data_kind, simulation_run_id

activity_5m (continuous aggregate / time_bucket('5 minutes', occurred_at))
  bucket, zone_id, category, new_crumbs

hotspot_snapshots (optional cache, not initially required)
  frame_time, zone_id, weighted_density, coordinates, synthetic_label
```

**Why 5-minute buckets if playback advances every 20 minutes?** Five-minute summaries let a 60-minute window update more accurately and support responsive Live mode. The frontend only requests/replays **20-minute** historical keyframes. These intervals solve different problems.

**Important:** Raw **counts** from 5-minute aggregates are not enough by themselves to implement moderation retractions or a precise per-Crumb fade. MVP can compute weights from eligible raw records in the last hour and benchmark the query. As scale increases, precompute eligible, weighted zone summaries and handle retractions explicitly. Don't promise continuous aggregates alone implement every business rule.

Example time-series aggregation pattern using Tiger Data's `time_bucket` function:

```sql
-- Illustrative: expects an activity_events hypertable with these columns.
SELECT
  time_bucket('5 minutes', occurred_at) AS bucket,
  zone_id,
  category,
  COUNT(DISTINCT crumb_id) AS created_crumbs
FROM activity_events
WHERE event_type = 'created'
  AND is_eligible_for_hotspot = TRUE
  AND occurred_at >= $1 AND occurred_at < $2
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;
```

This is an **exploratory SQL example**, not a validated materialized view. Production queries need deduplication, current suppression eligibility, event lifecycle semantics, and correct spatial aggregation. Tiger Cloud supports time-series hypertables and continuous aggregates; test available syntax/features against the provisioned instance.

### Geographic grouping

Begin with **known UF zones or grid cells**, because they are deterministic for the demo: Reitz, Turlington, Plaza of the Americas, Marston, Library West, etc. Assign each eligible Crumb to an approximate zone or grid cell; use cell centroids for heat points.

Alternatively, query generalized coordinates and let Mapbox's heatmap kernel visualize point density. Tiger's unique value then remains **time-indexed filtering and aggregation**. Don't build elaborate spatial tessellation before confirming the simpler approach works.

## 7. API and UI integration outline

Potential read-only server endpoints:

```text
GET /api/hotspots/live?category=event
GET /api/hotspots/rewind?date=YYYY-MM-DD&stepMinutes=20
GET /api/hotspots/details?zoneId=...&at=...
GET /api/activity/trends?zoneId=...&from=...&to=...
```

Example response (illustrative, not actual campus data):

```json
{
  "mode": "rewind",
  "frameTime": "2026-10-17T15:20:00-04:00",
  "windowMinutes": 60,
  "isSynthetic": true,
  "features": [
    {"zoneId": "reitz", "lat": 29.647, "lng": -82.347, "density": 8.2, "crumbCount": 12}
  ]
}
```

`lat`/`lng` here are **illustrative placeholders**, not authoritative building coordinates. Source production locations from a verified UF location dataset and use appropriate spatial generalization.

Mapbox implementation direction:

- Add a `GeoJSON` source of weighted generalized points or cells.
- Add `heatmap` layer; control `heatmap-weight`, `heatmap-color`, `heatmap-radius`, `heatmap-intensity`, and opacity.
- Overlay optional small bread silhouettes at high-intensity cluster centers.
- Reuse underlying source/layer in Live and Rewind modes; update source data/weights on frame changes.
- Allow a user to filter categories, turn heat off, or inspect actual contributing Crumbs.
- Ensure color is not the only way users learn intensity: hotspot details should include labels and counts.

### Freshness and playback performance

- Target fast current rendering; update locally on accepted new Crumb events as needed, reconcile with Tiger summaries when ready.
- Fetch all 20-minute keyframes for the day in one bounded request or small batches; cache per date/filter.
- Avoid 1 network call for every playback frame.
- Blend between frames for 300–700 ms to show smooth movement of hotspot intensity, then snap to a correct computed frame when the transition finishes.
- Clamp playback end to present time and support dragging to a specific timestamp.

## 8. Deterministic demo / seeding strategy

**The app may eventually serve hundreds or thousands of active students, but we do not need to pretend that adoption has already occurred.** Use a clearly labeled simulated dataset to test and demonstrate the experience.

Build a developer-only simulation command, e.g.:

```bash
npm run demo:seed-hotspots -- --date=2026-10-17 --count=500 --seed=breadcrumb-2026
npm run demo:clear-hotspots -- --simulation-run-id=<id>
```

Commands above are **proposed**, not implemented. Script should:

1. Be repeatable using a fixed random seed and log the run ID.
2. Generate ~300–500 **synthetic** Crumbs for a chosen local day (adjustable), plus created/resolved/expired events where appropriate.
3. Spread synthetic reports across campus zones with plausible **illustrative** time patterns, not claims about actual UF activity:
   - Morning: Turlington / academic buildings
   - Lunch: Reitz Union / plazas
   - Afternoon: library / club / plaza areas
   - Evening: student activities / Midtown
4. Vary timestamps, category, lifespan, freshness, and report density so hotspots visibly rise **and fade**.
5. Run through the same analytics transformation/ingestion code as real events; record counts and errors.
6. Mark ALL test records as `synthetic`; isolate them from production results or show a persistent **Demo data** indicator.
7. Use fictional titles and no fabricated emergency reports about identifiable people.
8. Allow clearing only the targeted simulation run; never delete real activity.
9. Include 2–3 scripted real test submissions from teammate devices during the live judge demo, distinguished from seeded data.

**Avoid fabricated evidence:** Do not claim seed data is real UF student reporting, actual campus footfall, live Yik Yak-derived activity, or a real history of today's events.

## 9. Ideal SwampHacks judge demonstration

### 30-second explanation of Tiger Data

> “Breadcrumb shows what students are reporting across campus right now. Supabase stores the live Crumbs, but Tiger Data records how that activity changes over time. We group timestamped reports by campus area, turn those summaries into live Mapbox hotspots, and let students rewind the day to see hotspots grow and fade. So Tiger Data isn't just holding another copy of our database — it powers the history behind campus discovery.”

### Ideal 90-second feature demo

| Time | Action | Why it matters |
|---|---|---|
| 0:00–0:15 | Open the UF map and enable the **Hotspots** overlay; show orange/red bread-themed glowing zones | Immediately legible student value; strong visual polish |
| 0:15–0:30 | Tap a bright zone and show “12 recent Crumbs near Reitz” plus real contributing Crumb cards | Heat is grounded in distinct reports, not fake crowd claims |
| 0:30–0:50 | A teammate drops a clearly marked test Crumb on another phone; hotspot grows after ingestion | Shows real write → Supabase → Tiger analytics → Mapbox rendering |
| 0:50–1:15 | Tap **Rewind**; scrub or press Play from midnight as Reitz, Turlington, and other hotspots appear and fade in **20-minute** steps | Highlights time-series history and the same map UI, not a separate dashboard |
| 1:15–1:30 | Optional Gemini question: “Where was activity concentrated around lunchtime?”; show grounded answer with a time window | Demonstrates analytics usable through Ask Breadcrumb |

**Important:** Preseed the historical frames and visibly label them “Simulated campus activity.” For the fresh Crumb, make the newly submitted live item visually distinct so the judge sees a real event enter the system.

### Technical proof for Tiger Data judges

Keep a small behind-the-scenes screen or terminal ready to show:

- Actual Tiger Cloud connection/service used by the app.
- The hypertable storing activity timestamps, with sample rows.
- A real query using `time_bucket` and/or a continuous aggregate.
- The current and historic frame API returning time/zone summaries.
- A live insertion changing the answer once the data is visible; show any aggregate refresh lag honestly.
- Optional benchmark showing measured query latency over the seeded dataset. **No invented speedups.**

### Minimal 10-second sponsor pitch

> “We use Tiger Data's time-series PostgreSQL to turn individual campus reports into time-bucketed geographic activity history. That powers Breadcrumb's live hotspots and 20-minute Campus Rewind on Mapbox — features students use to discover where campus activity is happening and how it changed today.”

## 10. Milestones and priorities

| Phase | What to implement | Exit condition |
|---|---|---|
| **P0 — Core first** | Preserve existing Mapbox Crumbs, Supabase creation and Realtime, Loaf verification | Normal Crumb posting and map still work without Tiger |
| **P1a — Hotspot MVP** | Eligible Crumb locations + Mapbox weighted heat layer + tap-to-inspect | Recent clustered test Crumbs form a visible hotspot |
| **P1b — Tiger Data** | Tiger Cloud instance, event ingestion, idempotent event IDs, hypertable, time queries | A real time-bucket SQL query returns expected location summaries |
| **P1c — Rewind** | Historical API, midnight→now frames, 60-min fading density, 20-min controls + interpolation | Playback shows hotspots growing and fading correctly |
| **P2 — Strong sponsor demo** | Seed/clear script, source labels, simple analytics debug view, documented benchmark | Entire Tiger demo is repeatable and works offline except required services |
| **P2 — Gemini** | `get_activity_near_area` / `get_activity_history` safe tools | Ask answers with citations and correct time windows |
| **Post-hackathon** | Retention, resilient outbox, sophisticated deduplication, multi-campus geographic indexing, replay performance at scale | Production readiness; not required for weekend demo |

**If time runs out:** Ship the map and live Crumb flow; keep the heat layer powered directly by recent Supabase records. Do not make the app depend on Tiger Data availability. Submit the Tiger sponsor challenge only if the actual deployed feature meaningfully calls and uses Tiger Cloud.

## 11. Acceptance tests and edge cases

- [ ] Two distinct nearby Crumbs produce more heat than one; many votes on one Crumb do **not** produce equal extra heat.
- [ ] A new eligible Crumb changes the live hotspot after a documented, bounded propagation delay.
- [ ] A 59-minute-old Crumb contributes little; a >60-minute-old Crumb contributes zero.
- [ ] At 12:00 AM the demo's day-scoped Rewind baseline is empty; playback doesn't accidentally show yesterday's data.
- [ ] A hotspot grows and later fades during rewind even if no new Crumbs are added.
- [ ] Rewind moves in 20-minute increments and supports the current partial frame.
- [ ] Supabase Full Loaf corroboration badge remains distinct from density/Loaf Zone visual language.
- [ ] Suspended/removed/private reports don't get exposed by historical detail views or aggregated heat after moderation.
- [ ] Categories excluded from hotspots (e.g. sensitive Sightings) remain excluded.
- [ ] Synthetic and real data can't silently mix in the live public view.
- [ ] Repeated analytics delivery doesn't double-count events.
- [ ] Tiger failure doesn't block posting a Crumb; retry/recovery is visible to developers.
- [ ] Tapping a hotspot opens grounded contributing Crumbs or clearly says none can currently be shown.
- [ ] Mobile and desktop heat overlays are readable, accessible, and performant.
- [ ] No fabricated claim that heat equals crowd size or verified event popularity.

## 12. Open questions (intentionally adjustable)

1. **Geography:** Named zones vs ~100–200 m grid cells vs raw generalized heat coordinates? Choose based on visual quality and privacy.
2. **Intensity thresholds:** At how many independent recent Crumbs does the loaf-shaped hotspot icon appear? Tune using real test UI and seeded data.
3. **Category policy:** Should construction and hazards have a separate dedicated non-social overlay? Suggested yes.
4. **Midnight semantics:** Reset on calendar-day rewind vs exact live sliding-window history across midnight; document any difference.
5. **Historical accuracy:** Do we reconstruct what was publicly shown at that moment, or what remains displayable after subsequent moderation? Privacy removal should always win.
6. **Tiger ingestion:** MVP API emission vs queue/outbox; benchmark and upgrade if needed.
7. **Aggregation:** Raw filtered queries for MVP vs 5-minute continuous aggregates plus invalidation/refresh.
8. **Map UI:** Full-screen map toggle, heat blend, loaf overlay details, and readable behavior at high zoom.
9. **Data access/retention:** Retain only the limited metadata needed for the feature, with deletion/moderation support.
10. **Venue provenance:** Official events versus independently reported activity remain visually and semantically distinct.

## 13. Helpful documentation

- [Tiger Data — documentation](https://docs.tigerdata.com/)
- [Tiger Data — time-series hypertables](https://docs.tigerdata.com/use-timescale/latest/hypertables/)
- [Tiger Data — continuous aggregates](https://docs.tigerdata.com/use-timescale/latest/continuous-aggregates/)
- [Tiger Data — time_bucket](https://docs.tigerdata.com/api/latest/hyperfunctions/time_bucket/)
- [Mapbox — heatmap layer example](https://docs.mapbox.com/mapbox-gl-js/example/heatmap-layer/)
- [Mapbox — heatmap paint properties](https://docs.mapbox.com/style-spec/reference/layers/#heatmap)

---

### One-sentence summary

**“Breadcrumb uses Tiger Data to remember where and when independent Crumbs clustered, and Mapbox turns that time-series history into live, bread-themed hotspots you can rewind through the day.”**
