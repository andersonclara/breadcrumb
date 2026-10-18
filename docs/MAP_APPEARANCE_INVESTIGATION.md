# Map appearance restoration investigation

Investigated: 2026-10-18 (local date). See [the incident handoff](MAP_APPEARANCE_CRASH_HANDOFF.md) for the recovery history.

## Result

The user confirmed the recovery baseline, isolated stages through Stage 4b, and normal-path Night cold starts on their iPhone. This includes static solid/gradient/fixture lighting, then appearance/zoom-dependent lighting with Night, Dusk, Day/Original and background/foreground checks. Saved/solar coloring and exterior lighting now run together by default on native. The user requested completing integration without additional staged phone gates, plus earlier map detail. No failing operation or native termination reason for the original incident has been identified.

Lighting follows the selected appearance automatically: full at night, 40% at dusk, off in Day/Original, fading out from zoom 8 to 4. Development overrides are optional and reset to normal on restart. Appearance-array animation and offscreen detail fades remain disconnected; these are replaced by the tested plain-JS rendering approach rather than reinstated. Phone model, iOS version, and Expo Go binary version remain unrecorded. No new native crash report or memory measurement was available. The final combined startup path and newly generated lower-tier detail have automated/build evidence, but have not received a separate physical-device report.

## Current native implementation

- Explore filters now have a normal **Map appearance** section: Automatic, Day, Dusk, Night, and **Original**. The temporary Stage 2b/3a controls and their ephemeral flags were removed. The development-only diagnostic screen and opt-in single-image probe remain available.
- The existing `breadcrumb.map-appearance.v1` choice is loaded automatically on native platforms. Automatic refreshes on the existing minute/focus/foreground cadence at UF, with no new location permission.
- `useMapAppearance` exposes preference readiness. The renderer stays unfiltered until storage succeeds or the user explicitly chooses a mode. A failed read stays unfiltered and displays an actionable error. A delayed read cannot replace a newer selection.
- **Original** is a persisted recovery choice. `mapAppearanceMatrix` returns no filter for it, even if the clock reports nighttime. Waiting for readiness also prevents a transient night/day filter from appearing before a saved Original preference loads. The solar/blend helper represents Original as daytime because it uses the daytime source artwork without recoloring.
- Each tile uses a plain JS matrix, memoized by the selected mode and numeric weights, through a per-image `ColorMatrix`. Exterior lights draw after the tiles in the existing camera group, with plain scalar opacity from the buffered JS scene. This uses the existing scene refresh cadence rather than every-frame shared appearance values. No additional surface, offscreen `Paint` layer, runtime shader, or animated appearance array is active.
- `mapLightConfig` defaults to appearance lighting in both development and release; release ignores diagnostic overrides. Before preferences are ready, and for Original, the lighting level is zero. Development Off is explicitly `null`; `undefined` restores the normal path.
- Full building/tree artwork and ground texture now start at baked asset level **4**, previously **5**. `MAP_STYLE_VERSION` is 3. The equivalent resolution threshold is roughly half the prior zoom (about 4.85 instead of 9.71 on a 390×844 view, before the existing tile-budget fallback). The existing scheduler can still select a lower tier to cover the buffered viewport within budget. Level 3 remains simple blocks; levels 0–2 remain overview. Cache limit 40, visible-tile cap 24, decode concurrency 2, 516×516 decoded tile dimensions, camera, hit masks, and highest-detail artwork are unchanged. Rebuild uses `node scripts/build-mobile-map.mjs --reuse-detail`, preserving level 5 and regenerating lower tiers.
- The Expo web preview keeps its existing image renderer and does not advertise these native appearance controls. The Next.js map is independent and unchanged.
- The temporary `map-tile-probe.ts` helper/tests were replaced with `map-appearance-rendering.ts` and startup/recovery tests. Do not restore the old stage flags when reviewing history below.

Validation: mobile lint and TypeScript passed; **71 tests passed** across nine map suites. Coverage includes default/release lighting behavior, explicit development overrides, lighting/zoom bounds, earlier detailed-art selection through the budgeted scheduler, pending preference reads, Original bypass, and finite alpha-preserving matrices. The earlier browser persistence/clock/error checks passed with readiness gating; that hook is unchanged by combined lighting promotion. Native bundle and generated-asset verification are recorded below. Resource limits are unchanged, but actual native memory remains unmeasured.

The earlier normal-path device procedure requested saved Night and two complete Expo Go restarts. The user confirmed that it worked. Stage 4a/4b confirmations below preceded default lighting integration; the final combined launch path is not separately claimed as device-verified.

Cold-start feedback: the user replied that the requested normal-path launch test worked and asked to keep going. Native memory remains unmeasured; the Original bypass also has unit/browser evidence but was not separately described in their reply.

## Stage 4a: static-lighting probe, off by default

Explore filters expose **Stage 4a · Static lighting check** only in native development. **Off** is the default and is not persisted. **Dot** draws one solid warm circle; **Glow** adds one radial gradient; **Fixtures** draws the fixed set of 27 exterior glows/cores. Dot/Glow zoom to 12 and anchor the marker two world units above/right of the camera center so the own-location avatar is less likely to cover it. Fixtures moves to camera `(196, 54, zoom 8)` to show the stadium exterior. These explicit diagnostic camera commands relinquish location follow, using the existing camera ownership path.

`CampusLights` was rewritten to use plain static probe props. The old shared numeric array and derived/animated opacity are gone. `CampusTiles` mounts it only when `__DEV__` and an explicit probe are present, as a child of the existing camera-transform group after the tile images. No extra canvas, offscreen layer, runtime effect, image set, animated appearance uniform, or new camera worklet was added. Tile color filters remain scoped to their images, leaving the fixture colors independent.

The original fixture anchors moved unchanged into `map-lighting.ts`. They represent illustrative University Avenue/landmark/stadium-exterior scenery, not real-time fixture status. The stadium field interior has no fixture anchors. Solid/glow markers at the view center are temporary test markers, not additions to that production fixture data.

Preparation checks: mobile lint and TypeScript passed; **66 tests passed** across nine map suites, including a fixture-count/coordinate budget check and exclusion of field-interior lamps. The served iOS bundle contained the new static `CampusLights` and Stage 4a controls alongside the already tested normal appearance path. The user confirmed Dot, Glow, and Fixtures looked correct and stayed open. Resource-count bounds and desktop checks do not establish native memory safety.

Phone procedure: choose Night, then test **Dot → Glow → Fixtures** separately, closing the sheet each time. Confirm the marker/glow/exterior lights are visible and the app stays open. Off removes the lights; a full restart must also leave this experiment off. Record the first failing option before adding opacity, zoom dependence, or automatic lighting.

## Stage 4b: follow appearance and zoom

The explicit Follow map probe reused the same fixture primitives, with bounded numeric opacity `night + dusk * .4` multiplied by a zoom factor from zero at 4 to full at 8. Day, Original, and unready preferences supply zero. No timing worklet, shared numeric array, new surface, or offscreen layer was added. Mobile lint/TypeScript and 68 tests across nine map suites passed. The served iOS bundle contained the probe and scalar helper. The user confirmed Night, zooming out/in, dimmer Dusk, Day/Original off, and background/reopen all looked good and stayed open.

## Combined defaults and earlier detail

The already-tested Follow map implementation is now the default, with no start action required. Development Dot/Glow/Fixtures/Off remain diagnostic overrides; Follow map or a full restart restores normal behavior. Appearance and lighting stay off until preference readiness and Original remains an unfiltered/unlit fallback. Earlier detail is baked into level 4 rather than increasing decode density or cache capacity. This preserves the bounded renderer while showing the requested artwork sooner. Automated validation is recorded above; physical-device evidence remains the user's successful preceding stages.

Asset verification: build completed with 1,365 tiles and 881 shared hit masks; 248 level-4 PNGs changed and the other eight level-4 images remained identical. All 1,024 level-5 tiles were retained. Encoded assets total 13,770,215 bytes (13.1 MiB); decoded dimensions and resource caps are unchanged. `ensure-mobile-map.mjs` accepts the generated version-3 source hash without rebuilding. Shared catalog and hit masks have no Git diff. A representative new level-4 tile was visually inspected for full building, tree, and ground detail. The final scheduler assertion passed again after the asset build. Diff whitespace and compiler-script syntax checks passed.

Served native bundle verification: fetched the running SDK-57 project's iOS development bundle (14,596,701 bytes). It contains normal Map appearance controls, the default-lighting resolver, Original/readiness rendering guards, and the generated version-3 manifest with the rebuilt source hash. The old `CampusTileLayer` offscreen detail component is absent. This confirms the combined code is served, not a separate physical-device launch result.

The sections below record earlier experiments as implemented. Their former default-off color/lighting behavior is history, not the current normal map behavior.

## Stage 1 implementation: preferences and solar clock

Open the map's filter sheet and choose **Appearance check (development)**. This entry and its route are guarded by `__DEV__`; a production route attempt cannot mount the diagnostic screen. The hook mounts on this screen, not on the map. It uses the existing local preference key so saved choices can be tested across launches, but no stored choice can enable a rendering effect.

The screen shows Automatic/Day/Dusk/Night, calculated percentages, UF sun altitude, the last refresh timestamp in UTC, storage status/errors, OS version, and the Expo Go version when available. The settings/clock path executes no map renderer, palette, lighting, or animation code. Stage 2a below adds an independently opted-in, lazily imported image test. The existing solar equations and foreground/focus refresh cadence are unchanged.

`useMapAppearance` now exposes its existing clock timestamp and tracks loading/saving/saved/error state. Read failures are visible. An older queued write's completion cannot overwrite the latest selection's status; asynchronous completions also avoid updating an unmounted screen.

Physical-device procedure:

1. Reload the actual mobile project in Expo Go. Open the map filters → **Appearance check (development)**.
2. Select Night, wait for **Choice saved on this device**, fully close/reopen Expo Go, and return to the check. Confirm Night is selected and the app stays open. Repeat cold starts.
3. Select Automatic. Background/foreground the app and confirm **Last checked** advances. Leave this screen open for a minute and verify another refresh. Return to Explore and back to verify focus refresh.
4. Confirm Day/Dusk/Night show 100% of their respective blend. Rapidly change choices, wait for saved status, restart, and verify the last choice restores.
5. Return to Explore and test pan/pinch/location follow. Record iPhone model, iOS version, and the displayed Expo Go version, plus any launch/background failure.

Do not begin Step 2a graphics experiments until this physical-device stage passes. Selecting Night here is a preference/clock test; the map's appearance remains the recovery version.

Implementation verification:

- Mobile lint and TypeScript: passed. The first TypeScript run preceded Expo's new-route type generation; it passed after generation, without a type cast or manual edit to generated types.
- The same six targeted map suites: **58 passed**.
- Actual development iOS bundle served from port 8081: contains `MapAppearanceLab`; the old `CampusLights` and `mapColorMatrix` functions are absent. Manifest identifies this repository's `apps/mobile` and SDK 57.
- Recovery renderer: still matches `50ebbe5` after normalizing line endings; neither native renderer nor `CampusMap` changed in Stage 1.
- Playwright against the actual Expo browser preview at `http://127.0.0.1:8081/map-appearance-lab` (title **Breadcrumb**): manual blend values, local persistence after reload, Automatic daylight/night values, minute refresh, web visibility refresh, storage read/write failures, and successful retry all passed. Rendering was checked at 375 x 812, 812 x 375, and 2x browser zoom, with reduced motion. No unexpected browser warnings/errors; Reanimated's reduced-motion development notice is expected. The page rendered meaningful content without a framework error overlay.
- Browser plugin was not available; installed Playwright was used. The Playwright CLI was not cached, so the installed Playwright library drove the checks without installing dependencies. Screenshots and temporary check scripts are in the system temp directory, outside source control.
- Browser visibility events, zoom, and reload are supporting checks, not substitutes for native AppState, Dynamic Type, and physical-iPhone cold starts. Native memory and device behavior remain unverified for Stage 1.

No package versions, native build requirements, or production map rendering changed.

### Physical-device feedback received during implementation

The user confirmed that Night remained selected after restarting Expo Go and that choosing Automatic did not break the app. They subsequently confirmed that **Last checked** updated. This supports the Stage 1 preference/clock path on the phone. Repeated cold starts, follow/gesture stress, native memory, and full device/client version details have not yet been recorded. The map retaining its recovery colors at this stage is expected.

## Stage 2a: isolated static-image probe

The bottom of **Appearance check** now has **Start image check**. It lazily imports `map-appearance-image-probe.tsx`, initially showing **Plain**. **Identity**, **Day**, and **Night** apply constant JS arrays to one Skia image. The sample is the existing `5-19-5.png` tile, 516 x 516 decoded pixels, displayed at up to 256 points. No appearance shared values, transitions, lights, layer groups, offscreen `Paint`, or gesture transforms are used by this probe. Its selection is independent of the saved appearance mode above it.

**Stop image check** unmounts the probe. A route remount/cold restart leaves the experiment off, even when the saved preference is Night. Starting again resets the sample to Plain. The main `CampusTiles` and `CampusMap` remain unchanged. The web-specific probe explains that native filters must be tested in Expo Go and imports no Skia.

Phone procedure: reload, open the development check, scroll to Stage 2a, start it, and inspect **Plain → Identity → Day → Night**, one selection at a time. Plain and Identity should match; Day and Night should change only the sample. Record the last selected option if Expo Go closes and obtain the corresponding native crash/jetsam report before adding more effects. Successful sample rendering does not yet validate applying filters to all visible tiles.

Preparation checks: mobile lint and TypeScript passed; the browser's Start/Stop/reload gate checks passed without browser warnings/errors. The served iOS entry bundle refers to a lazy native probe URL but does not execute/include its function body in the initial lazy response. Fetching that URL returned HTTP 200 and a compiled native probe with its static palette and Plain default. The old lighting component remains absent, and the main renderer still matches the recovery baseline. Stage 2a native rendering remains pending physical-device feedback. The prior 58 regression tests and Stage 1 browser checks remain supporting evidence, not proof that this new native probe works.

Physical-device update: the user subsequently confirmed that the Stage 2a sample image worked and looked good for the requested options on their iPhone. This supports the constant single-image filter path; it does not isolate the original crash or validate full-map filtering.

## Stage 2b: actual map tiles, explicit development opt-in

The Explore map's filter sheet now contains **Stage 2b · Map tile check**, with **Recovery**, **Identity**, **Day**, and **Night** choices. This section appears only in development on native platforms. It is separate from the Stage 1 saved preference and the Stage 2a small-image controls.

The choice lives only in `MapScreen` state, initialized to Recovery. `mapTileProbeMatrix` returns no matrix unless the caller explicitly enables the native development experiment; Recovery always returns no matrix. Nothing is written to storage. A full app restart/remount resets the choice, regardless of a saved Night preference from Stage 1. Fast Refresh is not a substitute for that restart check because React may preserve component state.

`CampusMap` forwards the optional plain JS matrix to `CampusTiles`. The native renderer adds `ColorMatrix` only as a child of each existing tile image when that prop is present. Its cache, scheduler, decode ownership, nearest-neighbor sampling, camera-derived transform, and single camera group are unchanged. No appearance arrays/shared values, timing transitions, lights, clipping groups, per-tier groups, or `Paint` layers were added. The web renderer accepts the optional prop for interface consistency and does not apply it; the web map cannot validate this native path.

Source comparison: after removing only the ColorMatrix import, optional prop, and conditional image child from the Stage 2b file, the renderer matches `50ebbe5` after normalizing line endings. The file itself no longer matches byte-for-byte because these explicit probe additions are now present.

Verification before the phone trial:

- Mobile lint and TypeScript passed.
- **61 tests passed** across seven targeted suites, including three new gate tests: disabled experiments cannot produce a matrix, Recovery stays unfiltered, and enabled matrices are finite/alpha-preserving constants with a true identity.
- Actual served iOS bundle contains Stage 2b controls and the gate helper; the old lighting component remains absent. Manifest still identifies this repository's SDK 57 mobile project.
- Main map control/render verification on a physical iPhone is pending. The browser cannot validate native tile filtering; the earlier browser tests cover the diagnostic settings and opt-in screen behavior only.

Phone procedure: reload, open the **Explore map filters**, scroll to Stage 2b, and try **Identity → Day → Night**, closing the sheet to inspect the full map and pan/pinch each time. Recovery should remove recoloring. Test foreground/background and location follow, then fully restart Expo Go and confirm Recovery is selected. Record any failure and its exact last selection/gesture before advancing to solar-driven map coloring or animation.

Physical-device update: the user confirmed that the Stage 2b full-map check worked well and looked good. This supports the static per-tile filter path on the phone. It does not identify which of the excluded animation, lighting, compositing, or combined-resource paths caused the original termination.

## Stage 3a: saved and solar-driven map colors, no animation

The Explore filter sheet now offers **Stage 3a · Saved map appearance → Start saved appearance check**. Once started, Automatic/Day/Dusk/Night use the same local preference hook tested in Stage 1 and the plain per-tile matrices tested in Stage 2b. Automatic updates each minute while focused/active, on focus, and on foreground return. Matrix calculation runs on JS and is memoized by the numeric light weights. No shared appearance values, timing animation, lights, or new renderer layers are added.

The experiment-enable flag is not persisted. Restart/remount leaves the recovered map unfiltered; starting Stage 3a again reads the last saved choice. **Stop saved appearance check** returns to Recovery. Choosing a Stage 2b option stops Stage 3a so the two sources cannot compete for the renderer's matrix prop.

`useMapAppearance(enabled)` keeps its storage reads, writes, foreground listener, and clock disabled until the native development test is started. The hook is still called consistently with React's hook rules. The lab uses its default enabled behavior. Re-enabling waits for any queued writes before re-reading storage; selection tickets prevent a late read from replacing a newer manual choice. This also permits a new activation to read a preference changed in the lab. While two screens remain mounted, they retain separate local mode state; this diagnostic workflow does not promise live preference synchronization across both screens.

Verification: mobile lint and TypeScript passed. The targeted suite now contains **63 tests**, including two hook lifecycle checks for disabled I/O and enabled listener/timer cleanup. The browser persistence, manual/automatic values, minute/visibility refresh, and simulated storage-failure checks passed after the enabled flag was introduced. The served native bundle contains the Stage 3a controls and still excludes the old lighting component. These checks support the implementation; combined rendering/clock behavior on the iPhone is pending.

Phone procedure: start Stage 3a in Explore's filters; try Day, Dusk, Night, and Automatic; pan/pinch and background/reopen the app. Confirm stable rendering and expected colors. After a full restart, start the check again and confirm the previous choice restores. Memory and repeated cold starts with appearance enabled remain outstanding before enabling this path by default.

Physical-device update: the user confirmed that everything in Stage 3a looked good after the requested saved/manual/Automatic and app lifecycle checks. Static recoloring was then promoted to the normal native path described above. Repeated cold starts with that normal path and native memory remain unverified.

## Findings from the original investigation

### The recovery renderer is intact

At the initial investigation and through Stage 2a, `apps/mobile/src/components/campus-tiles.tsx` matched commit `50ebbe5` after normalizing line endings. Stage 2b above adds only an optional static per-image filter and its prop. The renderer retains the original camera shared value, tile cache/scheduler, and nearest-neighbor image drawing. Stage 3a adds an explicitly enabled preference/solar hook on the map screen; lights remain disconnected.

Preserve the existing uncommitted recovery changes. Restoring these files from HEAD would reinstate the failed built-in-filter integration. Do not alter the existing `.work/capture-mobile-crash.mjs` edits or treat `.work/mobile-ios-recovery/` as the running app.

### The detailed offscreen layer could run during launch

The first mitigation removed the custom runtime shader but retained:

```tsx
<Group layer={<Paint opacity={opacity}/>}>{images}</Group>
```

for level 5, along with animated matrices and lights. This is an independent offscreen compositing path, not simply a color-filter change.

The app starts at zoom 12 (`explore-provider.tsx`). `CampusMap` initially measures 390 x 700 points. With that size, the existing tile-level formula selects level 5, and `mapTileOpacity(5, ...)` is approximately 0.109. At the 390 x 844 size used in the tests, it selects level 5 with opacity approximately 0.918. Thus, as close-up tiles arrive, the failed implementation can allocate/use its detailed layer without any pan or pinch. The failure timing does not rule out this path merely because the user had not zoomed yet.

The installed Skia implementation confirms the mechanism: `src/renderer/components/Group.tsx` converts a React-element `layer` into `skLayer`; `src/sksg/Recorder/Visitor.ts` records `saveLayer`; `cpp/api/recorder/RNRecorder.h` implements it with native `SkCanvas::saveLayer`. The failed version already had a viewport clip outside the camera transform. There is no evidence here that its allocation was unbounded, that the layer exceeded GPU limits, or that this operation caused the crash. Test it separately, last.

### A static native color filter has not been isolated

The built-in-filter mitigation still passed a derived shared array to every tile's `ColorMatrix`, updated an array with `withTiming`, and rendered the light gradients and detailed layer. Its failure cannot establish that a plain, static `ColorMatrix` is unsafe.

The installed native `cpp/api/recorder/ColorFilters.h` explicitly accepts a 20-element matrix; `Convertor.h` handles shared-value properties. The existing palette tests produce finite, alpha-preserving, 20-element arrays. This weakens the specific hypothesis of an obviously malformed matrix, but does not validate native thread handoff, animation, or resource lifetime.

The installed Skia `ReanimatedRecorder.ts` also documents GPU-resource ownership constraints. The recovery and failed renderers use the same JS-side image decoder/cache, so that comment alone is not evidence that ownership caused this incident. Avoid moving decode, image creation, or explicit disposal into worklets during restoration.

### Dependencies match the documented SDK

The installed Expo SDK 57 `bundledNativeModules.json` lists the project's versions: React 19.2.3, React Native 0.86.3, Skia 2.6.2, Reanimated 4.5.1, and Worklets 0.10.1. [Expo's versioned Skia guide](https://docs.expo.dev/versions/v57.0.0/sdk/skia/) independently lists 2.6.2 and Expo Go support. [The SDK reference](https://docs.expo.dev/versions/v57.0.0/) lists React Native 0.86 and React 19.2.3.

No package-version mismatch was found in those declarations. This does not identify the native modules in the user's particular Expo Go binary; record that binary's version before attempting an upstream compatibility diagnosis. No dependency upgrade is justified by the available evidence.

### Cache limits are not a measurement of peak process memory

Tiles are 516 x 516 pixels including gutters. Forty decoded RGBA tiles correspond to approximately 40.63 MiB for one pixel copy. Native/GPU copies, pending decodes, retained pictures, render surfaces, and the rest of Expo Go may add memory. The cache caps retained entries and concurrent decodes; it does not establish the peak resident memory of the process.

For scale only, a 390 x 844 point RGBA surface at a hypothetical 3x device scale is about 11.3 MiB per copy. This is an estimate, not the allocation of the failed layer or the user's phone. The cache predates the incident and remains in the working renderer. Do not call this a confirmed out-of-memory crash without a jetsam/termination report or native memory evidence.

## Safe sequence for implementation and physical-device tests

Use separate, reversible changes. Keep the recovered renderer as the default; use an explicit development-only opt-in for graphics experiments. Do not restore the failed implementation wholesale or automatically advance experiments after a restart. Persisted appearance preferences must never enable an unverified graphics path on launch.

| Step | Change under test | Exclude from that experiment |
| --- | --- | --- |
| 0 | Recovered app cold starts; record device and client versions | All appearance imports/effects |
| 1 | Existing solar/preference hook and Automatic/Day/Dusk/Night settings in a diagnostic surface; show calculated weights | All appearance rendering effects; do not imply the real map has changed |
| 2a | One small image with a constant identity matrix, then a constant day/night matrix | Animated properties, tile groups, lights, `Paint` layers |
| 2b | Constant per-image matrix on visible map tiles, using the recovered tile scheduler/transform | Shared appearance arrays, appearance animation, lights, new layers |
| 3a | Manual day/dusk/night switching with plain JS matrices; then Automatic with foreground refresh | Animated matrices, lights, new layers |
| 3b | Constant shared matrix; then derived matrix; then timed transition, as separate trials | Lights and detail compositing |
| 4a | One static solid light; then one static gradient; then the fixed fixture set | Appearance animation and detail layers |
| 4b | Zoom-dependent scalar light opacity, then appearance-dependent opacity | Detailed offscreen layer |
| 5 | Level groups, then detail opacity/compositing, tested independently of appearance | Other unverified changes |

At each step, record the exact source revision/diff, experimental setting, appearance, zoom, phone/OS/client versions, and outcome. Repeat cold starts and foreground/background cycles; stress pan/pinch and transitions between tile levels. Proceed only after the preceding physical-device trial passes. A minimal image test does not replace the visible-tile test.

If a stage fails, stop adding effects and compare its immediate predecessor with the failing stage. Obtain the matching iOS crash or jetsam report before another broad replacement. A JS inspector disconnect is not a native crash stack. Avoid interpreting silence from Metro as proof that a test passed.

If steps 2b/3a work, they can restore static contrast and manual/solar appearance before animated transitions, lights, or detail fades are reintroduced. Appearance changes and detail fading do not need to ship together. Theme labels/controls alongside a verified map palette so readability can be assessed on the phone.

If static native filters fail in isolation, a supported alternative worth evaluating is preprocessing a small set of palette variants into tile assets and drawing them through the recovered plain-image path. That trades filter execution for bundle size and asset/cache management; it is not already implemented or device-validated. Avoid crossfading several complete tile sets until memory is measured. Do not silently replace Skia, upgrade native packages, or require a development build.

## Verification from this investigation

- Mobile lint: passed.
- Mobile TypeScript check: passed.
- Six targeted map suites: **58 tests passed**, including the five appearance/desktop CanvasKit tests and 53 recovery-related tests.
- Renderer comparison with `50ebbe5`: matched.
- Search of active map screen/renderer: no appearance integration found.
- Installed SDK dependency declarations: the five core versions above match.
- Physical device: user reconfirmed successful recovery startup; no experimental appearance stage tested.
- Current Metro manifest/bundle: not checked successfully; no server answered at `127.0.0.1:8081` during this investigation. Do not reuse the prior session's bundle verification as current evidence.
- Online `expo install --check`: unavailable because the environment's network proxy refused the connection. The installed SDK declarations and versioned docs were inspected instead; an online compatibility check did not pass in this session.

Commands used for the successful checks:

```powershell
npm run lint --workspace=@breadcrumb/mobile
npm run typecheck --workspace=@breadcrumb/mobile
npm test -- tests/mobile-map-appearance.test.ts tests/mobile-map-tiles.test.ts tests/mobile-map-touch.test.ts tests/mobile-map-camera-races.test.ts tests/mobile-map-detail.test.ts tests/mobile-live-location.test.ts
```

Vitest initially hit a sandbox `spawn EPERM` in Vite's Windows path resolution. The same targeted command passed after an approved execution outside that sandbox. No test/configuration changes were needed.

Final acceptance still requires the physical-iPhone checks in the handoff: repeated launches, foreground/background, pan/pinch/follow ownership, appearance switching/persistence, readable night terrain, automatic twilight behavior, and bounded memory. None of the desktop checks establishes that the appearance crash is fixed.
