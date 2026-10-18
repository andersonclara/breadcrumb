# Breadcrumb UI redesign plan

Status: proposed design and implementation plan; no application changes included.
Updated: October 17, 2026.

> Audit follow-up: use [the mobile implementation plan](MOBILE_IMPLEMENTATION_PLAN.md) to track fixes, dependencies, and acceptance criteria. It adopts unified Explore with contextual Ask as the working navigation recommendation, revising this proposal's Map/Ask two-tab assumption. This document remains design background; neither document means application changes have been implemented.

## 1. Product direction

Create an immersive, illustrated UF campus that students can explore, paired with a useful conversational discovery guide. The map fills the viewport. Controls sit above the world and reveal more detail only when needed.

The two primary destinations are **Map** and **Ask**. This replaces the four/five-tab navigation described in older documents. The user's Pokemon Go reference establishes the full-screen world, lightweight controls, and direct map interaction. It does not require AR, a 3D engine, background GPS, or that game's assets and UI.

The intended feeling is warm, playful, tactile, readable, and deliberately composed. Retain the bread identity, pixel characters, original UF landmark art, and Crumb-to-Loaf progression. Rework the interface around them: typography, layout, navigation, controls, sheets, cards, and empty states.

Design mobile first. Deliver the same product structure on Expo and responsive web using platform-appropriate controls and gestures. Preserve the existing Next.js, Expo, shared packages, cached campus geometry, and Supabase foundation. Inspect concurrent map-performance changes before modifying map code.

## 2. Navigation and screen inventory

| Existing surface | New home |
| --- | --- |
| Campus map | Map, the default tab |
| AI discovery | Ask, the second tab |
| Live Buzz | A Nearby list opened from the Map |
| Community selection | A compact Map scope selector; selection remains visible |
| Community directory and creation | Community management sheet/screen reached from the selector and profile |
| Friends and sharing | Avatar/profile menu; explicit sharing controls |
| Avatar workshop and account | Avatar/profile menu and first-contribution onboarding |
| Radar | Future notification settings within account; no unfinished primary tab |
| Drop a Crumb | A distinct action button on the Map; not a third navigation tab |

The app preserves map camera, filters, selection, conversation, and chat scroll when switching tabs. Supporting screens have a consistent close/back path. Existing web URLs should remain usable through appropriate routes or redirects. Distinguish transient sheets from navigable screens so browser and native Back behavior stays predictable.

## 3. Full-screen Map

### Resting state

- Campus artwork extends to all viewport edges, including behind overlay controls where safe.
- Remove the large header, marketing sidebar, persistent instructional strips, and duplicate posting buttons.
- Use a compact community/scope selector near the top left and the user's avatar/account control near the top right.
- Provide small, accessible filter and recenter controls. Essential controls remain legible against any map terrain through solid or nearly opaque surfaces.
- Place a compact two-tab Map/Ask dock within the safe area. A separate bread action starts posting. Establish their placement in the visual concept so neither obstructs the Nearby sheet or selected result.
- Nearby opens a collapsed/expandable discovery sheet. It does not occupy a permanent large portion of the initial map.
- Show active time/category filters clearly without introducing another permanent row of tabs.
- Default to a useful campus overview. A user may explicitly choose their foreground location or a named campus place. Browsing works when location is denied or unavailable.
- Disable always-on preview walkers and simulated camera following in the normal product. Any intentional demo mode must be clearly separated and labeled.

### Interaction rules

- Drag/pinch explores. Tapping a real marker selects it. Tapping empty map dismisses selection; it should not unexpectedly open a posting form.
- The bread action enters explicit placement mode with a target and Cancel/Use this spot controls. Optional long-press is a shortcut with a visible alternative.
- Selecting a marker opens one detail sheet and positions the camera so the marker remains visible above/beside it.
- Closing a sheet returns to the same map position. Switching to Ask preserves that map state.
- Desktop uses contextual drawers/cards with comfortable widths, while leaving the campus visible. There is no permanently required marketing/sidebar layout.

### Map art direction

Adopt one consistent oblique pixel illustration language: pixel scale, perspective, shadow direction, terrain colors, building outlines, and label rules.

Start with the hero demo area around Marston, Turlington, and Century Tower. Refine the existing landmark artwork rather than replacing everything at once. Ordinary buildings should have quiet, coherent roof and facade treatments. Landmark details, readable pins, and selected discoveries should receive the strongest visual emphasis.

Use restrained greens, warm stone/brick, and subtle ground detail. Avoid enormous uninterrupted bright roof/grass areas. Add original trees, benches, and landscape details selectively; they remain decorative and never imply live people or activity. Keep accurate geographic anchors beneath the illustration.

Labels appear by zoom and importance, avoid collisions, and do not clip awkwardly at viewport edges. Pin sizes and hit areas remain usable as the camera changes. Cluster dense discoveries with meaningful counts. Nearby list rows provide an accessible alternative to map-only interaction.

Evaluate performance on a real phone early. Separate static terrain from moving markers and UI updates; use culling/caching and appropriate detail levels. Retain the existing renderer unless profiling establishes a concrete blocker. A new map engine is a separate scoped decision.

## 4. Ask as the second flagship screen

Use the current `POST /api/ask` contract documented in `ASK_BACKEND.md`, not the speculative payload in the older AI plan.

### Empty and conversational states

- Start with one short prompt, a small bread character/brand moment, and three useful suggestions such as free food, tonight's events, and events near Reitz.
- Make the input comfortable and prominent. Keep it above the keyboard and safe area on phones. Hide or reposition navigation while the keyboard is open if necessary to avoid crowding.
- Render concise answers followed by one to four source-backed discovery cards, then useful follow-up actions.
- Show active constraints in a compact summary. Preserve the returned `context` for follow-ups and offer Clear conversation. Treat explicit reset as a real context reset.
- Use an honest loading state. The current endpoint returns JSON rather than a stream; do not simulate token streaming. True streaming can be evaluated later.
- Design clarification, no-results, unsupported request, quota, unavailable service, retry, and offline states as carefully as success.
- Keep conversation state in the active session by default. Do not introduce permanent chat/location history as part of the redesign.

On phones, Ask is a dedicated readable conversation surface. On desktop, it may occupy a generous conversational panel over the full-screen campus, with the selected map result visible alongside it. Background artwork must not reduce text contrast.

### Card and map handoff

Both Nearby and Ask use the same visual anatomy for a discovery: title, venue, time/freshness, relevant price information, source, record type, and primary action.

Use the stable pair `(kind, id)` for selection. A sourced scheduled event and a community Crumb have distinct visual markers and details. Only Crumbs use confirmation/Loaf states.

View on Map switches to Map, selects the same record, frames its real coordinates, and opens its detail sheet. Returning to Ask restores the conversation and scroll position. An expired, removed, or no-longer-accessible record gets an explicit unavailable state instead of a stale active pin.

Records without usable coordinates remain useful cards with venue/source information. They do not receive guessed pins or misleading View on Map actions. Off-campus results outside the cached map also remain cards unless a deliberate map-bounds extension is implemented.

Ask currently searches public campus information. Selecting a private community on the Map does not silently expand Ask's access or send that community's content to the model. Make this scope clear when relevant. Opening a public Ask result from a private map scope should explicitly select Campus and preserve the prior scope for return.

## 5. Supporting flows and visual system

### Posting

Use a short sequence: choose a spot, enter title/category/community, review related existing reports, submit. Keep location and community visible. Details are optional. Provide a visible primary action above keyboard/safe-area obstructions.

If sign-in or avatar setup is needed, preserve the draft and selected point through the return path. Avoid putting unsigned-in users through a full form only to discard their work. Use a brief bread-drop animation after the backend confirms success, then show the real created/grouped record.

### Details and social screens

- Crumb details prioritize title, age, location, community, and confirmation state. Confirm is the main action; dispute and report remain easy to find but visually secondary.
- Event details prioritize time/date precision, venue, pricing, and source. Date-only does not become a midnight event; unknown pricing does not become free.
- Profile, Friends, community management, avatar editing, and login share typography, surfaces, action placement, and navigation rules.
- Community accents indicate scope without recoloring the entire app unpredictably.
- Logged-out and empty states use a purposeful composition, one helpful action, and concise copy. No fabricated social proof or activity.
- Browsing and Ask remain available without sign-in. Posting remains UF-account-gated.

### Design system

- Keep pixel type for the logo, short expressive headings, and selected celebratory moments. Use a readable companion sans serif for controls, descriptions, chat, and forms; compare candidates in the concept stage.
- Target roughly 16px mobile body/input text and 12–14px secondary labels. Essential actions must not depend on the current 4–8px pixel labels.
- Define warm light surfaces, dark ink, a toast-colored primary accent, and semantic state colors. Keep map terrain quieter than selected markers and important controls.
- Establish one spacing scale, a small set of corner treatments, restrained borders, and consistent shadows. Pixel art may stay crisp while surrounding controls use comfortable tactile shapes.
- Create a coherent icon family. Avoid mixing arbitrary Unicode glyphs with detailed sprites.
- Build reusable button, dock, filter, input, chip, discovery row/card, detail sheet, avatar control, status, and empty-state components.
- Meet text contrast requirements, comfortable touch targets, visible focus, keyboard access, reduced motion, and screen-reader naming. Native text scaling and device safe areas are part of design acceptance.
- Use brief motion to explain changes: sheet movement, selected-pin feedback, bread placement, and a Loaf transition after confirmed state updates. Avoid continuous ambient movement that competes with discovery.

## 6. Integration work that the visuals depend on

The current world hook supplies Crumbs, communities, avatars, friends, and presence. It does not supply imported events. `GET /api/events` provides factual public listings but currently omits coordinates from its response. Ask records already have nullable coordinates.

Before promising event pins, inspect how published event locations relate to trusted places, measure actual coordinate coverage, and define the smallest public read contract needed for map records and record-detail revalidation. If reliable coordinates are unavailable, ship useful list/cards first. Any schema changes must use new migrations and preserve publication/RLS boundaries.

Create a shared, client-safe discovery contract and adapters for events and Crumbs while retaining their different meanings. Keep server-only AI modules and credentials out of both frontend bundles. Reuse the current Ask provider and quotas; the redesign does not require a model-provider migration.

Introduce durable app-level state for the camera, selected `(kind,id)`, map scope, filters, conversation, and return context. Avoid reloading the entire map or dropping chat state when switching tabs. Refresh selected records before showing current-state actions, and distinguish network failure from a genuinely empty feed.

Preserve foreground-only location handling, approximate friend sharing, accepted-friend authorization, presence expiry, community membership restrictions, and independent confirmations. Centering a map or using a coarse point for Ask must never automatically enable friend sharing.

## 7. Execution sequence and completion gates

| Phase | Work | Completion gate |
| --- | --- | --- |
| 1. Visual specification | Generate coordinated mobile Map, selected-place sheet, Ask results, posting, and desktop concepts. Compare against current screenshots. Lock typography, palette, navigation, card anatomy, and art direction. | The complete primary flow is visually reviewable at real device size before implementation. |
| 2. App shell and primitives | Implement two-tab navigation, shared styles/components, responsive overlays, sheet behavior, and state preservation. | Map is full screen; switching tabs and supporting screens preserves context and has no overflow/keyboard traps. |
| 3. Map and art | Refine the core UF scene, camera defaults, landmarks, markers, labels, gestures, placement, and Nearby sheet. Profile the existing renderer. | The default campus view looks composed; real markers are readable/tappable; no fake walkers; physical-device gestures are smooth. |
| 4. Connected discovery | Build Ask UI against the existing API; add event adapters/read contracts as required; implement cards, follow-ups, and record-to-map selection. | A real query returns real cards; a mappable card opens the correct marker; return preserves chat; missing-location and failure states work. |
| 5. Contribution and supporting screens | Finish draft-preserving sign-in/avatar flow, posting, confirmation, Friends, communities, and consistent account surfaces. | Two real accounts can complete contribution/corroboration; private scopes and sharing rules remain effective. |
| 6. Final polish and demo verification | Compare screenshots to approved concepts; tune rhythm, copy, motion, empty/loading/error states; test real phones, desktop, touch, keyboard, and slow network. | No high-severity visual or interaction issues on the demo device; the complete demo succeeds repeatedly with authentic data. |

After Phase 1, audit event coordinate coverage and record-selection feasibility before committing to the final map-result interaction. Phase 4's contract/adapters can be prepared while the map art is being refined, but the shell and selection model should be settled first.

Do not assign a precise schedule until the remaining hackathon time, demo device, and team availability are known. Review after each completion gate rather than treating finished JSX as finished design.

## 8. Hackathon priorities and finish line

The essential demo is: open a beautiful campus world; switch to Ask; request a real discovery; refine the query; open a correctly located result on the map; post a Crumb; independently confirm it from another account; see the updated state. Plan the exact query around verified available records without inventing content.

Must ship: two tabs, full-screen map, readable visual system, coherent discovery cards/details, real Ask integration, reliable map handoff, usable posting/auth, honest states, and device QA.

Polish after that path is dependable: broader custom landmark art, more nuanced marker clustering, richer avatar transitions, optional haptics, and additional refinements to the campus environment.

Defer from this UI redesign: AR, a 3D-engine rewrite, background tracking, a new authentication provider, calendar integrations, analytics infrastructure, Radar/push delivery, and permanent chat history. Existing sponsor integration plans remain separately scoped and should enter only when their backend and demo requirements are deliberately prioritized.

Acceptance is observable: a first-time user identifies Map and Ask immediately; essential text is readable at normal phone scale; every selected result resolves consistently; the keyboard never hides the main action; map gestures do not accidentally post; empty/error states are clear; and the app remains coherent across its entire public and authenticated journey.

## 9. Source of truth

- This plan establishes the proposed two-tab redesign requested by the user.
- `ASK_BACKEND.md` and actual runtime schemas define the current Ask contract. Older four-tab, Mapbox, streaming, and model-only assumptions in `ASK_BREADCRUMB_AI_PLAN.md` are not implementation requirements for this redesign.
- `EVENT_INGESTION.md` and `EVENT_INGESTION_VERIFICATION.md` explain event publication and source provenance.
- Actual world/community code, migrations, and project invariants govern account, confirmation, membership, and location behavior; older deployment notes in `PIXEL_WORLD.md` and `COMMUNITIES.md` require reconciliation rather than literal replay.
- `BREADPASS_AUTH0_PLAN.md` and `TIGER_DATA_PLAN.md` remain separate proposals, not evidence of deployed integrations.

The next deliverable is a coordinated visual concept set for the primary mobile flow and its desktop adaptation. Approval of that visual specification should precede the application redesign.
