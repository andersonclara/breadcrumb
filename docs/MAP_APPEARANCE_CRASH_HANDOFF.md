# Map appearance crash — next-session handoff

Updated: 2026-10-18

Follow-up: [restoration investigation](MAP_APPEARANCE_INVESTIGATION.md) records successful iPhone feedback through Stage 4b: saved/solar coloring, normal-path Night cold starts, static gradients/fixtures, and appearance/zoom-dependent lighting. Colors and exterior lighting now run together by default on native, with a persisted **Original** unfiltered/unlit recovery choice. Detailed artwork is baked into level 4 as well as level 5 so it appears roughly one zoom tier earlier, without increasing runtime cache/loading budgets. The user requested completing integration without more staged phone gates. Appearance animation and offscreen detail compositing remain absent; the original crash cause is unidentified. The rollback descriptions below are incident history; read the linked current-state section before editing.

## Goal and current status

Restore the improved map contrast and day/dusk/night appearance **without crashing Expo Go on the user's iPhone**. The user still wants this feature; the rollback is a recovery step, not the final product decision.

**The user confirmed the app stays open after the appearance integration was rolled back and Expo was restarted. The exact crashing operation has not been identified.** Do not describe the shader, Skia, or any individual API as the confirmed root cause.

The incident session ended with recovery documentation. Appearance has since been restored using the conservative rendering path described in the follow-up above.

## What the user experienced

- The app worked before the map appearance changes.
- After those changes, opening Breadcrumb inside **Expo Go on iPhone** loaded briefly, then closed the entire Expo Go app.
- This was not a reported React error screen. No iOS native crash report or symbolicated stack was obtained.
- Replacing the custom shader with built-in color filters did **not** resolve the reported crash.
- After the final rollback and a restart, the user reported that the app stopped crashing but the night effects were gone. Their absence is expected in the recovery version.
- The precise iPhone model, iOS version, and Expo Go binary version were not recorded.

## Desired appearance

- Distinguishable roads, cream pedestrian paths, muted sage lawns, and warm buildings in daylight.
- Gradual daylight/twilight/night changes based on the sun at UF, without needing another location permission.
- Readable roads and buildings at night, with restrained warm exterior lighting along University Avenue and selected landmarks/stadium perimeter.
- Manual Automatic / Day / Dusk / Night choices, originally placed in the map filter sheet and persisted locally.
- Preserve the existing pixel artwork and zoom-dependent detail tiers.
- Lighting is illustrative scenery, not verified real-time fixture or venue status. Stadium field floodlights were intentionally excluded.

## Relevant versions

From `apps/mobile/package.json` at investigation time:

| Package | Version |
| --- | --- |
| Expo | `~57.0.30` |
| React Native | `0.86.3` |
| React | `19.2.3` |
| React Native Skia | `2.6.2` |
| Reanimated | `4.5.1` |
| React Native Worklets | `0.10.1` |
| Supabase JS | `^2.118.0` |

`npx expo install --check` reported compatible dependencies. No package upgrades were used to address this crash. Follow `apps/mobile/AGENTS.md` and read the matching Expo SDK documentation before changing native/Expo APIs.

## What was implemented, attempted, and rolled back

### 1. Original appearance implementation

`campus-tiles.tsx` compiled a custom `Skia.RuntimeEffect` at module scope. A `RuntimeShader` inside a `Paint` on an outer `Group layer` recolored the composited map using terrain color anchors and a three-element daylight uniform.

Additional changes included:

- A shared numeric array animated with `withTiming` for day/dusk/night weights.
- Derived shader uniforms updated from that shared value.
- `CampusLights`, using Skia circles and radial gradients with zoom-dependent animated opacity.
- Per-level tile groups; the detailed tier used an offscreen `Paint` layer for its opacity fade.
- The appearance hook, preference persistence, solar calculations, filter-sheet choices, and darker map labels/controls.

Desktop CanvasKit shader compilation and sampled pixel tests passed. iOS/Android JavaScript exports passed. **Neither test exercised the actual iPhone native rendering path or established that it could launch safely.**

### 2. First mitigation: built-in filters

The custom runtime shader and its outer filtered layer were removed. Built-in `ColorMatrix` filters were attached to individual tile images instead. Animated appearance weights, lighting gradients, and the detailed-tier opacity layer remained.

The user subsequently reported that Expo Go still closed. This means removing only the runtime shader was not a sufficient fix; it does not establish which remaining component failed.

### 3. Temporary iOS-only image fallback

A temporary `campus-tiles.ios.tsx` bypassed Skia completely using `Animated.Image` tiles and a dark translucent overlay. It had a separate image-placement helper and an alignment test.

An iOS diagnostic export's source map confirmed that it selected this fallback and contained zero Skia modules. **There was no conclusive device confirmation that this intermediate version fixed the crash.** Do not conflate its export verification with a successful phone test.

This fallback, its helper, and its dedicated test were removed in the final rollback. They are not the current implementation.

### 4. Final recovery: restore the earlier renderer and disconnect appearance

The active `apps/mobile/src/components/campus-tiles.tsx` was restored to the renderer in commit **`50ebbe5`**. Its contents were compared after normalizing line endings and verified to match.

That renderer uses the existing Skia canvas, one camera-transformed group, and cached tile images with nearest-neighbor sampling. It has no appearance filter, runtime effect, lighting component, animated appearance array, or per-tier `Paint` layer.

The rollback also:

- Removed `useMapAppearance()` and appearance controls from `apps/mobile/src/app/(tabs)/index.tsx`.
- Removed the `light` prop and appearance-specific label/control/background changes from `apps/mobile/src/components/campus-map.tsx`.
- Removed the temporary iOS-specific renderer so platform resolution selects the shared renderer again.

**Current stable rendering still uses Skia. Skia itself has not been established as the cause.**

Location tracking, avatar positioning, gesture/follow ownership fixes, signup changes, and the previously generated zoom-detail tile assets were preserved. The rollback did remove the renderer's new animated detail-tier fade; pure tests of its helper do not mean that fade is still wired into the canvas.

## Files and Git state to understand before editing

At documentation time, HEAD was **`46c18e7` (`pushing map stuff`)**, whose parent was `50ebbe5`. HEAD contains the built-in-filter mitigation, not the first custom-shader implementation.

The working recovery changes are **uncommitted modifications** to these files:

- `apps/mobile/src/components/campus-tiles.tsx`
- `apps/mobile/src/components/campus-map.tsx`
- `apps/mobile/src/app/(tabs)/index.tsx`

Start by checking `git status` and the current diff. **Do not reset the workspace or restore all of HEAD:** doing so would reactivate the appearance integration associated with the crash report. The user also committed other work during this investigation; do not replace unrelated code with an older snapshot.

Useful read-only comparisons:

```powershell
git diff -- apps/mobile/src/components/campus-tiles.tsx apps/mobile/src/components/campus-map.tsx 'apps/mobile/src/app/(tabs)/index.tsx'
git show 50ebbe5:apps/mobile/src/components/campus-tiles.tsx
git show 46c18e7:apps/mobile/src/components/campus-tiles.tsx
```

Appearance source remains on disk, but is disconnected from the active map screen:

- `apps/mobile/src/lib/map-appearance.ts`: NOAA-based solar altitude at UF; blend weights; appearance choices.
- `apps/mobile/src/lib/use-map-appearance.ts`: local preference storage and focused/foreground time updates.
- `apps/mobile/src/lib/map-palette.ts`: the later built-in color-matrix approach, **not** the original custom shader.
- `apps/mobile/src/components/campus-lights.tsx`: the exterior-light overlay.
- `tests/mobile-map-appearance.test.ts`: solar/blending tests and desktop CanvasKit color-filter checks.

Optional study/debug artifacts are under `.work/`. They are not production code. `.work/mobile-ios-recovery/` is an intermediate diagnostic export, not the final recovered app; do not ship it as the current implementation. Earlier palette previews also do not establish phone compatibility.

## Checks and actual device evidence

After the final rollback:

- Mobile lint passed.
- Mobile TypeScript checking passed.
- 53 targeted tests passed across map tiles, touch handling, camera races, detail helpers, and live location.
- The running Expo server's manifest was checked and pointed to this repository's `apps/mobile` project with SDK 57.
- Its actual iOS development bundle was fetched and checked: the appearance hook, lighting component, palette function, and temporary image-placement helper were absent; the restored `CampusTiles` was present.
- **The user confirmed the app no longer crashed after restarting.** This is the strongest device evidence, but the rollback changed multiple things at once and does not isolate a single cause.

Commands used for the final checks:

```powershell
npm run lint --workspace=@breadcrumb/mobile
npm run typecheck --workspace=@breadcrumb/mobile
npm test -- tests/mobile-map-tiles.test.ts tests/mobile-map-touch.test.ts tests/mobile-map-camera-races.test.ts tests/mobile-map-detail.test.ts tests/mobile-live-location.test.ts
```

## Separate warnings that should not distract the investigation

### Supabase deprecated lock warning

The deprecated `processLock` import and `auth.lock` option were removed from `apps/mobile/src/lib/supabase.ts` according to Supabase's migration guide. Storage, session persistence, and automatic refresh remain configured. A local auth initialization check produced no lock warning.

That cleanup remained in place when the recovered app worked. There is no evidence that the warning caused the native crash; do not reintroduce the deprecated option as a crash fix.

### DevTools connection warnings and `origin undefined`

The assistant ran `.work/capture-mobile-crash.mjs` to attach to Metro's device inspector. Its initial WebSocket request omitted `Origin`, causing a 401 and this terminal message:

```text
Connection from DevTools failed to be established for origin 'undefined' ...
```

This diagnostic failure is separate from the original app failure. The listener was stopped. Its script was subsequently edited to pass `origin: 'http://127.0.0.1:8081'`; successful capture was not established. If reusing it, verify the connection actually succeeds and stop it after the investigation. Do not count waiting/disconnected messages as an app crash trace.

## Recommended investigation in the next session

1. Confirm the current recovery version cold-starts on the user's iPhone in Expo Go before editing. Record the phone, iOS, and Expo Go versions. Use the actual running project, not an old exported bundle or a stale recent-project entry.
2. Preserve the recovery diff. Compare the appearance integration against it rather than undoing unrelated changes or reinstating the entire failing implementation.
3. Reintroduce **one separately testable change at a time**, with a phone restart check after each:
   - Appearance settings and solar calculations, without any rendering effects.
   - A static native color filter on a small image, then actual visible tiles; no animated uniforms or new offscreen layers.
   - Color transitions/shared values.
   - A single static light, then gradients and animated lighting.
   - Detail-tier compositing/fades as a separate change.
4. Investigate native compatibility, shared-value handoff, GPU allocation/compositing bounds, and resource lifetime only as **hypotheses** until a minimal reproduction or native stack supports one. Do not assume a particular upstream Skia issue matches this incident.
5. If the app closes, capture the iOS crash or jetsam report. The user can look under Settings → Privacy & Security → Analytics & Improvements → Analytics Data for Expo/Exponent or a matching memory-termination report. Identify the exception/termination and implicated thread before making another broad replacement.
6. If the current rendering strategy is incompatible with the actual Expo Go binary, evaluate a supported alternative. Do not upgrade native dependencies arbitrarily or silently switch the user to a development build.

Acceptance requires repeated successful **physical-iPhone** cold starts, foreground/background cycles, pan/pinch/follow behavior, and appearance switching. Verify readable roads/buildings at night, preference persistence, automatic twilight behavior, and bounded memory. Passing lint, desktop rendering, and bundle export alone is insufficient to declare this incident fixed.
