# Breadcrumb mobile implementation plan

Status: planned; application implementation has not started under this plan.
Created: October 17, 2026.
Scope: Expo / React Native mobile experience, with shared contracts and backend changes only where required.

## 1. Purpose and source of truth

Turn the mobile UI/UX and engineering audit into a trackable sequence of improvements. The goal is a complete, understandable discovery-to-action journey before adding more visual detail or secondary features.

**Success:** A new student can open Breadcrumb, find a worthwhile campus discovery, understand its location and freshness, and contribute an update without someone explaining the interface.

Use this document as the implementation checklist for the audit follow-up. The older [UI redesign proposal](UI_REDESIGN_PLAN.md) remains design background. Where the two differ, this plan uses the audit's working recommendation: **one map-led Explore experience, with Nearby and contextual Ask**, rather than immediately making Map and Ask equal tabs. Record subsequent product decisions here; do not silently implement conflicting plans.

Supporting contracts and constraints:

- [Ask backend](ASK_BACKEND.md) and its actual runtime schemas define Ask integration.
- [Event ingestion](EVENT_INGESTION.md) defines publication and source provenance.
- [Mobile instructions](../apps/mobile/AGENTS.md) govern Expo/native implementation and checks.
- [Mobile setup](../apps/mobile/README.md), [authentication](AUTH.md), and [pixel world](PIXEL_WORLD.md) provide context. Reconcile older prose with actual code before relying on it.

No renderer rewrite, backend replacement, authentication-provider migration, or new state-management library is required by this plan.

## 2. How to use this plan

1. Reinspect the current working tree before each phase. The audit included substantial uncommitted work; preserve unrelated changes.
2. Choose the earliest incomplete task whose dependencies are met.
3. Mark it `In progress` in the tracker and record an owner if useful.
4. Implement a reviewable slice; test the behavior it changes.
5. Compare the rendered result at phone size, including failure states.
6. Mark it `Done` only when its acceptance criteria pass. Record evidence, remaining limitations, and the commit/PR when available.

Statuses: `Planned`, `In progress`, `Blocked`, `Done`, `Deferred`. A checked box means verified, not merely coded. Do not record native QA as passed based on browser screenshots or bundle export.

Complexity: **S** = localized change; **M** = several coordinated components; **L** = a substantial flow/integration. These are relative estimates, not time commitments.

## 3. Audit baseline

These findings describe the audited working tree and must be rechecked if files change:

- Five tab routes are declared, but the tab bar is hidden. Ask and Radar are placeholders.
- Live Buzz and Communities render noninteractive Crumb rows. Scheduled events are not connected to mobile discovery.
- `CampusMap` declares but does not consume `placing`; ordinary taps can start posting. Preview walkers and automatic following are enabled.
- Functional pixel labels commonly use 6–10-point text. Map zoom targets are 36×36. Some text colors fail ordinary-text contrast requirements.
- The composer spends its initial visible area on recipe decoration. The intended posting path gates the form behind approximately 850 ms and 1,350 ms animations.
- Authentication has no explicit draft/return-intent contract. Account setup bundles credentials and extensive avatar customization.
- Building details show only Full Loaves. Crumb details lack a clear venue/expiry hierarchy and foreground report reasons.
- World reads have no explicit loading state. Global persistent notices can obscure newer errors.
- The active map renders all 3,119 road paths and updates its scene on a 225 ms timer. Campus JSON is about 33.5 MB of source data, not a measured installed/download size.
- Separate map optimization components are not connected to the active renderer and reference missing exports.

Validation at audit time:

| Check | Result | Limitation |
| --- | --- | --- |
| Mobile lint | Passed | Not a usability or runtime check |
| Mobile TypeScript | Failed: five missing-export errors | Reconcile unfinished map work |
| Five focused test files | 14 passed / 10 failed | Failures in map-performance test file; these are not device FPS benchmarks |
| Expo mobile web render | Inspected Map, composer, Login, Friends, Communities, Buzz, Ask, Radar | Browser rendering does not establish native behavior |
| Android Expo Go | Did not reach the app during verification | Loading failures; cause not established as an application defect |
| Authenticated/live-data journeys | Not exercised | Preview had no connected Supabase client |

## 4. Product decisions and boundaries

### Working navigation

```text
Explore — default, edge-to-edge map
  Nearby — synchronized discovery list sheet
  Search — places and discoveries
  Ask — full-height conversation route, launched from Explore
  Detail — selected Crumb or scheduled event
  Filters / community scope
  Post a Crumb — placement → composer

Avatar / account entry
  Profile / avatar
  Friends
  Communities
  Saved — when functional
  Account / notification settings

Report — contextual action from a discovery detail
```

- Keep Nearby visible in the resting Explore state; map-first must not mean map-only.
- Give Ask a readable full-height surface and preserve its conversation when returning to the map.
- Use the avatar control for account features. Use the scope selector to reach community management.
- Make Post a labeled action, not a navigation tab.
- Keep Radar and unimplemented Saved/notifications out of visible navigation.
- Consider Explore + Saved tabs only after saving exists and recurring usage supports the hierarchy.
- If Map + Ask tabs are chosen later, keep the same shared selection, camera, cards, and return-state contracts.

### Preserve these invariants

- Browsing and public Ask work without sign-in; contribution retains required UF verification and backend authorization.
- No fake live events, reports, friend positions, or attendance indicators.
- Map recentering does not enable friend sharing. Sharing remains explicit, approximate, accepted-friends-only, and foreground-only.
- Public Ask does not acquire private-community access from the map's scope selection.
- Scheduled events and community Crumbs remain distinct. Only Crumbs have confirmation/Loaf progression.
- Missing coordinates never become guessed pins. Unknown price never becomes free. Date-only events never become midnight events.
- Changes to SQL authorization, lifecycle, or required onboarding use deliberate migrations and checks; do not bypass guards in the UI.
- Preserve the bread identity and illustrated campus; prioritize usefulness over more decoration.

## 5. Task tracker and dependencies

| ID | Priority | Task | Complexity | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| B01 | P0 | Build, routing, and device baseline | M | — | Planned |
| U01 | P0 | Readable primitives and app shell | M | B01 | Planned |
| S01 | P0 | Honest loading, error, and mutation state | M | B01 | Planned |
| M01 | P0 | Predictable map exploration and placement | M | U01 | Planned |
| D01 | P0 | Discovery contract, Nearby, and useful details | L | U01, S01; M01 for map handoff | Planned |
| C01 | P0 | Fast posting and resumable authentication | M–L | U01, S01, M01 | Planned |
| A01 | P1* | Real Ask integration and map handoff | M–L | D01, S01 | Planned |
| U02 | P1 | Sheet, keyboard, and accessibility completion | M | U01; verify each completed flow | Planned |
| M02 | P1* | Targeted map performance work | M–L | B01, M01 | Planned |
| P01 | P1 | Friends, communities, profile, account recovery | M | U01, S01, C01 | Planned |
| R01 | P2 | Saved discoveries | M | D01 | Planned |
| V01 | P2 | Signature feedback and visual refinement | S–M | Stable core journeys | Planned |
| Q01 | Release gate | Real-device acceptance and demo rehearsal | M | All features selected for delivery | Planned |

`P1*`: Promote A01 if a real AI flow is required for the hackathon demonstration. Promote the specific M02 fixes needed if device profiling shows interaction-blocking performance. Neither promotion should displace build correctness, readable controls, or honest states.

Suggested sequence: **B01 → U01/S01 → M01 → D01/C01 → A01 → U02/P01/M02 → Q01**. U01/S01 and D01/C01 can be separate workstreams if a team is available; coordinate shared files and contracts first. Accessibility and device inspection start with the first slice, not at the end.

## 6. P0 implementation work

### B01 — Establish a trustworthy baseline

**User impact:** Prevent launch failures, missing navigation, and regressions hidden by incomplete checks.

**Files:** `apps/mobile/src/app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `components/campus-map-scene.tsx`, `lib/map-scene.ts`, `lib/map-gesture.ts`, `packages/shared/src/index.ts`, `walking.ts`, `tests/mobile-map-performance.test.ts`.

**Approach:**

- Inspect the uncommitted map optimization work and decide which implementation is intended to be active.
- Reconcile `campusPeople`, camera types/helpers, and outdated scene expectations. Do not blindly restore obsolete assets or delete failed tests merely to obtain green checks.
- Resolve or isolate browser diagnostics about invalid text children/SVG props; verify whether native is affected.
- Launch on the actual demo phone with the correct Expo SDK/client and reachable backend.
- Record initial screenshots and basic startup/interaction behavior before optimization.

**Acceptance:**

- [ ] Mobile lint and typecheck pass.
- [ ] Relevant focused tests pass for the intended implementation.
- [ ] Native app launches on the demo device; environment problems are recorded separately from application defects.
- [ ] No visible feature is an unreachable route or a misleading placeholder destination.
- [ ] No unrelated working-tree changes are overwritten.

### U01 — Readable primitives and Explore shell

**User impact:** Immediate improvement to every screen and the first-time experience.

**Files:** `components/game-ui.tsx`, root/tab layouts, MapScreen (`app/(tabs)/index.tsx`), shared palette. Proposed new modules: `theme.ts`, `ExploreHeader`, `DiscoveryRow`, and a shared sheet primitive; these names are suggestions, not existing files.

**Approach:**

- Keep pixel typography for the wordmark and short expressive moments; use system sans for functional UI.
- Establish the type, spacing, target-size, color, and shape tokens in section 9.
- Introduce reusable buttons with primary/secondary/destructive variants and pressed/loading/disabled states, labeled inputs, chips, and feedback.
- Replace the crowded header with search, scope/filter summary, and avatar entry.
- Keep Nearby and Post visible near the bottom; do not build a new placeholder tab bar.
- Establish one route/back contract for supporting screens. Preserve camera and scope through navigation.

**Acceptance:**

- [ ] Functional labels are readable at normal phone scale; no 6–8-point essential controls remain in the core flow.
- [ ] Touch targets are at least 48×48 logical units, including close, filter, zoom, and password visibility controls.
- [ ] Normal text contrast is at least 4.5:1; selection is not conveyed by color alone.
- [ ] At 375-wide and enlarged system text, core controls do not clip or overlap.
- [ ] Explore, Nearby, account, and Post are discoverable without instructions.

### S01 — Explicit data and action states

**User impact:** Users can tell whether there is no activity, data is still loading, or the connection failed.

**Files:** `packages/client/src/index.ts`, `providers/world-provider.tsx`, `providers/auth-provider.tsx`, `lib/api.ts`, `lib/world.ts`, screen feedback.

**Approach:**

- Expose initial loading, loaded-empty, refreshing, stale, and error states; keep last-good data during a recoverable refresh failure.
- Treat missing configuration as unavailable rather than a successful empty world.
- Replace the single persistent global notice/pending flag with action-specific state where needed.
- Provide retry, bounded requests/cancellation, and duplicate-submission protection. Avoid overlapping polls; pause unnecessary polling in background and refresh on foreground.
- Keep technical migration/configuration details in diagnostics, with actionable user-facing recovery copy.
- Preserve auth-change response ordering safeguards; do not allow an old user's response to populate a new session.

**Acceptance:**

- [ ] Loading, empty, disconnected, stale, and failed states are distinguishable.
- [ ] A stale success message cannot suppress a new failure.
- [ ] Failed writes retain input and provide a relevant retry/edit action.
- [ ] Pending one action does not unnecessarily disable unrelated screens.
- [ ] Background/foreground transitions and sign-out do not apply stale account data.

### M01 — Predictable map exploration and placement

**User impact:** The main surface feels stable and remains under the user's control.

**Files:** `components/campus-map.tsx`, MapScreen, `packages/shared/src/walking.ts`, `building-events.ts`, `camera.ts`, `components/toast-crumb-button.tsx`.

**Approach:**

- Consume explicit placement state. Ordinary taps select a marker/building or dismiss selection; they never start a post.
- Remove posting on building double tap and the 400 ms single-tap delay.
- Disable default preview walkers and camera following. Use a stable useful campus camera.
- Provide Cancel / Use this spot in placement mode, and an accessible place-list alternative to coordinate tapping.
- Remove pre-composer animation gates; acknowledge input immediately.
- Add local recenter with permission-denied/manual fallback, separate from friend sharing.
- Prioritize selected labels and recognizable landmarks. Suppress collisions and unnecessary utility-building labels.
- Frame selection above the sheet and preserve camera on dismissal/return.

**Acceptance:**

- [ ] Twenty exploratory taps/pans produce no accidental posting forms.
- [ ] Post enters a visibly distinct, cancellable placement state.
- [ ] Map opens without fake people or autonomous camera motion.
- [ ] Initial-view priority labels do not overlap or clip.
- [ ] Recenter never changes sharing consent.
- [ ] Opening/closing details and returning from another route preserve map context.

### D01 — One complete discovery loop

**User impact:** Students can find a real opportunity and decide what to do next.

**Files:** `app/(tabs)/buzz.tsx`, MapScreen, `components/building-events.tsx`, `packages/shared/src/world.ts`, `src/lib/events/read.ts`, `src/app/api/events/route.ts`, `src/lib/ai/ask/schema.ts`.

**Approach:**

- Define a client-safe discovery contract keyed by `(kind, id)`, with adapters for Crumbs and scheduled events. Preserve distinct freshness, confidence, source, time, and price semantics.
- Inspect actual event/place coordinate coverage. The existing events read response omits coordinates; add a minimal public read/detail contract if necessary without exposing staging/private data.
- Repurpose Buzz as an actionable Nearby list with shared cards, loading/empty/error states, and refresh.
- Use a shared selection model for list, map, building sheet, and Ask. Do not clear unrelated map context while selecting a result.
- Show fresh unconfirmed reports in building details, alongside corroborated reports and scheduled listings where available.
- Prioritize title, venue, time/freshness, expiry, source, and primary action. Put report reasons in a secondary flow; distinguish ended activity from abuse.
- Only expose working actions: open source, view on map when coordinates exist, confirm a Crumb, and directions when a reliable destination is available.
- Use a simple building/overlap list if a full clustering solution is too large for the first slice.

**Acceptance:**

- [ ] A real event and a real Crumb can each be found and opened from Nearby.
- [ ] A known-coordinate result selects the same item on the map and in its detail.
- [ ] Missing coordinates retain a useful card without a misleading map action.
- [ ] Fresh reports remain discoverable before they become Full Loaves.
- [ ] Removed/expired/private results are revalidated or shown unavailable before current-state actions.
- [ ] Scheduled events never inherit Crumb confirmation claims; price/time uncertainty stays explicit.
- [ ] List and map scope/filter behavior is consistent and visible.

### C01 — Fast contribution and resumable authentication

**User impact:** Students can post time-sensitive information without losing work or completing unnecessary customization.

**Files:** `components/crumb-composer.tsx`, MapScreen, `app/login.tsx`, `app/profile.tsx`, `components/profile-editor.tsx`, avatar routes/components, auth/write guards if onboarding requirements change.

**Approach:**

- Replace recipe framing with title, location/change, “What's happening?”, category, community, related reports, and Post.
- Clarify that the selected coordinate is required while adding a named building is optional.
- Preserve the draft, location, audience, and return intent in app-level state through authentication. Clear on successful post or explicit discard; avoid leaking drafts across different signed-in accounts.
- Resume the composer after sign-in instead of redirecting blindly to home.
- Allow accepting a default avatar; keep required account verification intact. Reconcile any server-side completion requirements rather than bypassing them.
- Keep submit reachable above the keyboard; distinguish field errors from request errors.
- Use the returned created/grouped record ID for success selection; play optional bread feedback after confirmed success.

**Acceptance:**

- [ ] Actual input is visible immediately when the composer opens.
- [ ] Post remains reachable with the keyboard open on iOS and Android.
- [ ] Sign-in returns to the same draft and location without re-entry.
- [ ] Failed submissions retain the draft; rapid repeated taps create only one intended submission.
- [ ] Existing-report confirmation and adding an update remain distinct actions.
- [ ] Success opens the correct created/grouped record.
- [ ] Closing an unsent draft has deliberate preserve/discard behavior.

## 7. P1 implementation work

### A01 — Real Ask, connected to Explore

**User impact:** Natural-language discovery becomes useful without a disconnected second product.

**Files:** `app/(tabs)/ask.tsx` or its replacement route, `lib/api.ts`, shared discovery UI/state, Ask schema and backend route.

**Approach:** Launch a full-height conversation from Explore. Offer three concrete prompts, preserve returned context, render concise answers and source-backed cards, and keep the input above the keyboard. Handle all response statuses and quota/network failures. The endpoint returns JSON: do not fake streaming. Ask scope remains public; any transition from private map scope is explicit. Coarse location is opt-in and separate from sharing.

**Acceptance:**

- [ ] A real query and follow-up preserve the intended constraints.
- [ ] Cards use stable `(kind, id)` selection and the same details as Nearby.
- [ ] View on Map frames a valid result; returning restores conversation and scroll.
- [ ] No-results, clarification, unsupported, quota, offline, and unavailable-service states preserve the question and provide recovery.
- [ ] New conversation clears context; private data is never included accidentally.

### U02 — Complete sheet, keyboard, and accessibility behavior

**User impact:** Core flows work comfortably across devices and assistive technologies.

**Files:** shared sheet/control primitives, MapScreen modals, Login, ProfileEditor, CommunityManager, Nearby/Ask lists.

**Approach:** Standardize peek/expanded/detail states, native Back/dismiss behavior, bottom insets, focus restoration, keyboard avoidance, and visible gesture alternatives. Use semantic labels and states. Keep a full list alternative to map interaction. Audit real text scaling and reduced-motion settings.

**Acceptance:**

- [ ] All shipped flows can be completed using VoiceOver/TalkBack, including discovery and posting location selection.
- [ ] Background content is not actionable through a modal; focus returns to the trigger on close.
- [ ] Primary actions remain visible above keyboard and system bars.
- [ ] Android Back and iOS dismissal do not unexpectedly discard a draft or reset Explore.
- [ ] Largest supported text and reduced motion preserve meaning and access to actions.

### M02 — Targeted performance, based on measurements

**User impact:** Smooth exploration as map detail and real content increase.

**Files:** CampusMap, map-scene components/helpers, shared geography/walking code, growing discovery lists.

**Approach:** Complete the chosen spatial indexing/batching path; isolate static terrain/buildings from people and marker updates; stop unfocused timers; move continuous gestures/animations away from repeated whole-scene React updates where supported. Inspect startup cost of shared barrel imports and geography/art construction. Virtualize growing lists. Profile before considering a different renderer.

**Acceptance:**

- [ ] Record device, OS, release-build configuration, representative record count, startup timing, frame behavior, and memory before/after.
- [ ] No static-terrain React rerender is driven by each decorative animation tick.
- [ ] Pan/pinch and selection remain responsive during refresh and under representative dense content.
- [ ] Repeated navigation does not cause continually increasing retained memory or duplicate timers.
- [ ] Renderer replacement is proposed only if measurements establish a blocker that targeted changes cannot reasonably solve.

### P01 — Coherent supporting screens

**User impact:** Removes social/account dead ends and makes secondary tasks predictable.

**Files:** Friends, Communities, Profile, CommunityManager, ProfileEditor, AvatarWorkshop, Login.

**Approach:** Communities owns joining/discovery; Profile owns identity/settings; Friends separates requests from accepted friends. Show full recognizable handles, direct sign-in actions, copy/share code, and deliberate removal. Separate required account completion from optional avatar editing; keep preview visible while changing categories. Add password recovery and distinct resend/change-email actions using supported auth contracts.

**Acceptance:**

- [ ] Users can join a community from its directory without hunting through Profile.
- [ ] Logged-out Friends provides a direct sign-in path.
- [ ] Friend identities are recognizable and request/removal feedback is specific.
- [ ] Copy/share code and recovery/resend flows work on the demo device.
- [ ] Avatar edits can be previewed without repeatedly scrolling between controls and preview.
- [ ] Sharing remains opt-in, approximate, and stops in background; denied permission has a recovery path.

## 8. P2 and release work

### R01 — Saved discoveries

**Impact / complexity:** Repeat-use value / M.
**Files:** shared cards/details, proposed Saved route and persistence layer.
**Approach:** Save/unsave with explicit account/local-storage semantics; retain expired/removed states. Do not add a primary Saved tab until functional.

- [ ] Saved items survive restart under the chosen persistence contract.
- [ ] Removed or expired records do not appear current.
- [ ] Unsave is easily reversible; switching accounts does not mix private saved data.

### V01 — Signature feedback and visual refinement

**Impact / complexity:** Memorable finishing detail / S–M.
**Files:** ToastCrumbButton, pixel-art, mutation/detail feedback, map labels/art.
**Approach:** Brief post-success bread-drop and corroboration transitions, optional haptics, quieter terrain, coherent icons. Expand artwork only after usefulness and performance gates pass.

- [ ] Animation reflects confirmed state, never blocks input, and stops when unfocused.
- [ ] Reduced motion retains equivalent feedback.
- [ ] Icons, selected states, borders, and typography use shared tokens across all shipped screens.

### Q01 — Device acceptance and repeatable demo

**Impact / complexity:** Release confidence / M.
**Files:** app configuration/assets and all shipped routes; verification record below.

- [ ] Cold launch, session restoration, slow network, offline, retry, and expired-data behavior are checked on the actual demo phone.
- [ ] Browse → detail → map → return succeeds without state loss.
- [ ] Ask → refine → map → return succeeds if Ask is included in the delivery.
- [ ] Logged-out post → sign-in/setup → resume → submit succeeds.
- [ ] A second authorized account independently confirms the report and sees its updated state; authors cannot manufacture corroboration.
- [ ] Private scope and friend-sharing restrictions remain effective.
- [ ] Small/large phone layouts, enlarged text, screen readers, keyboard, safe areas, and reduced motion are checked.
- [ ] Tablet behavior is tested if tablet support remains enabled; unsupported layouts are not accidentally advertised.
- [ ] No placeholders, fabricated activity, raw setup instructions, or broken actions appear in the demo path.
- [ ] The full demonstration succeeds repeatedly using authentic available records; no data fabrication is needed to make the screen look populated.

## 9. Design and interaction specification

### Core tokens

| Role | Working specification |
| --- | --- |
| Wordmark / brief expressive text | Press Start 2P, sparingly |
| Screen heading | System sans 24/30, semibold |
| Card/detail title | System sans 18/24, semibold |
| Body/input | System sans 16/24 |
| Metadata | System sans 13/18 |
| Buttons | System sans 15–16, semibold; minimum 48 high |
| Spacing | 4, 8, 12, 16, 24, 32 |
| Sheet/card padding | 16; section gaps 24 |
| Inputs | Minimum 52 high; grow for text scaling |
| Icon controls | 48×48 interactive area |
| Corners | Approximately 12 for controls/cards, 20 for sheets |
| Borders | Mostly 1; stronger only for meaningful emphasis |
| Background / surface | `#FFF7E8` / `#FFFCF5` |
| Ink / secondary ink | `#49382C` / `#6D5845` |
| Primary action | `#F4BC55` with dark text |
| Border / success / danger | `#DDCBB4` / `#2F684A` / `#A43F35` |

Validate actual color combinations; token suggestions alone are not a contrast audit. Use minimum heights and wrapping rather than shrinking text to fit.

### Explore composition

- Map extends to viewport edges; controls respect safe areas.
- Top: 48-high search and separate avatar entry; below: one compact scope/filter summary.
- Bottom: Nearby initially peeks about 140–180 points on a typical phone, enough to expose useful content. Allow collapse for exploration.
- Post and recenter remain reachable above the sheet; move/hide floating controls when expanded content would overlap them.
- Avoid a permanent instructional strip. Use one-time/contextual guidance only for unfamiliar interactions.
- Maintain constant screen-space marker sizes and adequate hit areas. Prefer an overlap list to choosing an arbitrary first matching marker.

### Details and cards

- Shared anatomy: title → venue/time or freshness → price/source/confidence → useful action.
- Crumbs: age, expiry, confirmation count, and status in plain language; bread state is supplementary.
- Scheduled events: precise known date/time, venue, source, and price evidence.
- One primary action; reports and destructive operations are secondary.
- Selected marker remains visible above details; dismissal restores context.

### State ownership

- **Server state:** world/discoveries, auth, freshness, read errors, per-action pending/error.
- **Navigation/UI state:** camera, community/filter scope, selected `(kind,id)`, sheet state, return destination.
- **Draft state:** report text, category, community, location, explicit discard/success lifecycle.
- **Ask state:** messages, returned context, pending request, scroll/return position; session-only by default.

Use the smallest sufficient implementation, such as a reducer plus focused contexts. Separate rapidly changing map values from unrelated consumers. Do not introduce permanent chat or location history as a side effect of state preservation.

### Motion

- Immediate pressed feedback; interruptible sheet transitions around 220–300 ms.
- Optional confirmed-success effect around 300–500 ms.
- No pre-action animation gates or autonomous camera drift.
- Honor reduced motion and app focus/background lifecycle.

## 10. Verification commands and evidence

Read the installed Expo version and matching versioned docs before changing Expo/React Native APIs, as required by mobile instructions. At this plan's creation the app uses Expo 57 and React Native 0.86.3; verify again before implementation.

Run from the repository root (PowerShell can use `npm.cmd`):

```powershell
npm run lint --workspace=@breadcrumb/mobile
npm run typecheck --workspace=@breadcrumb/mobile
npm exec -- vitest run tests/mobile-map-performance.test.ts tests/building-events.test.ts tests/post-location.test.ts tests/post-recipe.test.ts tests/crumb-drop.test.ts
```

Run tests relevant to additional auth, shared, API, or database changes. At integration/release boundaries:

```powershell
npm run check
npm run export --workspace=@breadcrumb/mobile
```

Run `npm run build` when web/server/shared changes affect the Next.js application. Native export proves compilation, not gesture, email, permission, or device correctness. Do not repeatedly run broad suites without a new change, failure, or unresolved concern.

Add behavior tests for state restoration, selection handoff, duplicate submission, lifecycle, and authorization changes. Do not add tests that merely mirror cosmetic style values.

### Verification log

| Date | Task / commit | Device or environment | Checks and evidence | Remaining limitations |
| --- | --- | --- | --- | --- |
| 2026-10-17 | Audit baseline | Expo web; native launch attempted | Results in section 3 | No native UI or authenticated live journey verified |

## 11. Hackathon delivery cuts

**Minimum useful delivery:** B01, U01, S01, M01, D01, C01, and Q01 for the shipped scope. Include the accessibility, keyboard, and sheet behaviors needed for those journeys even if broader U02 work remains.

**If AI is required for judging:** include A01 after shared cards/selection exist. Demonstrate one real query, one refinement, one correctly located result, and return to the conversation.

**Cut first if time is short:** Saved, push/Radar, community creation redesign, expanded avatar options, elaborate clustering, additional campus artwork, and optional haptics.

**Do not cut:** readable controls, a dependable return path, truthful empty/error states, posting draft preservation, authorization/privacy constraints, and real-device verification of the demo journey.

## 12. Decision and progress log

Resolve these through inspection and the first implementation slices; they are not automatic approval gates:

| Decision | Working default / next evidence | Record outcome |
| --- | --- | --- |
| Primary navigation | Unified Explore with contextual full-height Ask; revisit only for a concrete product reason | Pending phase U01 |
| Demo scope/device | Identify target phone, remaining time, and whether AI is required | Pending kickoff |
| Event coordinates | Audit real published records and trusted place associations; list-only where unknown | Pending D01 |
| Account/avatar gate | Preserve verification; permit accepting a default avatar if backend rules can support it | Pending C01 |
| Map optimization branch | Reconcile existing partial components and tests before integrating | Pending B01/M02 |
| Sheet implementation | Verify SDK-compatible options and needed gestures/accessibility; keep abstraction small | Pending U01/U02 |
| Performance budget | Set against the actual demo device and release-build baseline | Pending B01/M02 |

For each completed slice, append a short entry:

```text
Date / Task ID:
Status / Owner:
What changed:
Files / Commit or PR:
Acceptance criteria verified:
Device / checks / screenshots:
Remaining limitations or follow-up:
```
