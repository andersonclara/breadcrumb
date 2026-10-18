# Campus demo and published events

Open Explore and tap **Demo**. It adds **144 simulated reports**, including **90 free-food reports**, for **five minutes**. The largest food clusters are around Reitz, Turlington, and Library West; other reports cover events, crowds, maintenance, and hazards across campus. The demo selects Campus / This week / All categories, frames the hotspots, and enables Heatmap + pins. Existing published events remain available alongside the simulated reports.

Use the map filters to choose **Freebies** or switch **Pins / Heatmap + pins**. Orange through red encodes the number of active reports in a spatial bucket, not attendance or simulated confirmation counts. At most 48 heat cells render using the existing SVG dependency and camera anchors; no new Skia surface, shader, tile set, or offscreen layer is introduced. Pins and the list remain available when heatmap is off.

While the demo is active, open **Ask** and try **Free food now**, **Free food near Reitz**, or a details follow-up. Ask receives only a start time and seed for the synthetic data. The server reconstructs the same report IDs and facts as the map, applies time/topic/category/location/reference constraints, and rechecks expiry after the model responds. Answers and cards identify simulated evidence. The normal public event/report search and existing quota/origin restrictions remain active.

**End demo**, timeout, sign-out/account change, or app reload removes the simulated dataset. The hidden expiry timer uses wall-clock time and checks again on foreground, so backgrounding cannot pause its lifetime. Ending the demo clears its selections and chat turns/context and aborts pending demo chat. Simulated reports cannot be saved, voted on, or reported; they are never inserted into Supabase or local storage. Real event listings are unaffected. Model requests process selected fictional evidence through the existing AI provider; no private world/profile/friend/presence data is added to AI retrieval.

## Published events on the map

The old discovery RPC's 20-candidate budget is appropriate for Ask ranking but could hide reviewed Instagram events from the map. `/api/discover` now supplements normal public retrieval with up to 180 published events and a separate allocation of up to 20 published Instagram events. IDs are deduplicated, source links and scheduled times are retained, expired/unsafe-source events are omitted, and review/cancelled rows remain excluded. Exact record checks still use the existing retrieval path. This is bounded retrieval, not a complete export of every listing.

Known official building names, including an explicit parenthesized room such as **Communicore (C1-007)**, receive an illustrated map anchor. Unknown/vague/off-campus venues remain in the list without a fabricated pin. A live October 18 check returned 191 discoveries, 21 with coordinates, including these three upcoming published Instagram events:

- **Guest Speaker: Elizabeth Bello** — Communicore, pinned.
- **Fall Open House** — Emerson Alumni Hall, pinned.
- **C-Lunch** — venue supplied as “Plaza,” left unpinned because the location is ambiguous.

No event publication status, original dates, database schema, or real report rows were changed.

## Validation

- 135 targeted tests across 15 suites passed: deterministic IDs/data, bounds/categories/counts, heat-count semantics, timed expiry, exact AI references/location/time filters, post-generation expiry, request injection/expiry rejection, publication/source/venue handling, discovery routes, and map interactions.
- Mobile lint and mobile/root TypeScript checks passed; server/shared/test files passed targeted lint.
- Expo web rendered checks used actual Map/Ask/Explore components in a temporary guest QA harness, removed after verification. The Browser plugin was unavailable, so installed Playwright was used without adding dependencies. Portrait 375×812, landscape 812×375, and reduced-motion rendering were exercised; runtime errors were absent. Landscape panels were separated so controls remain usable.
- One real AI call returned four records from the active demo and explicitly called them fictional demo evidence. Manual stop, timer advancement beyond 180 seconds, chat/heatmap cleanup, and reload reset passed.
- Screenshots and scripts are local temporary artifacts, not production routes. Physical iPhone performance/background behavior has not received a new device report for this feature.
- The served SDK-57 iOS development bundle compiled (14,620,889 bytes), contains the demo controls/generator/heatmap, and excludes the removed temporary preview harness. This verifies native bundling, not a new physical-device run.
