# Mobile map performance

Updated October 17, 2026. Target reported by the user: iPhone in Expo Go.

## Tiled renderer migration

The active mobile map now draws precompiled image tiles rather than native SVG
terrain/building paths. `npm run map:mobile` builds six resolution levels from
the existing artwork (1,365 PNG files, 512-pixel interiors with a two-pixel
gutter). Static buildings and trees are baked into the tiles in painter order;
posts, people, labels, and selection remain independent overlays. Source artwork
and the Next.js renderer are preserved.

Expo's Metro resolver selects `index.mobile.ts` and the compact
`campus-mobile.json` catalog. This excludes the 33.5 MB source JSON and eager
architectural/walking initialization from the runtime dependency graph. The
compact catalog preserves building search, coordinate conversion, nearby-post
descriptions, and discovery location resolution. Separate shared alpha masks
preserve building taps without loading colored sprite geometry. Own-position
markers retain their actual GPS anchor instead of scanning all walkways to snap
to a path.

Native rendering uses Expo SDK 57's compatible Skia 2.6.2 canvas. One camera
transform stays on the UI thread. The Expo browser preview uses the same tile
assets and scheduler through image views; browser results do not measure Skia or
iPhone performance.

### Loading and memory bounds

- Decode only nearby assets, with two concurrent loads and at most 24 requested
  detail tiles. Parent tiles and a permanent overview cover missing detail.
- Preserve cached imagery during pan and zoom; detail replaces its fallback
  only after it loads. Tile gutters prevent gaps between neighboring images.
- Keep at most 40 decoded cache entries (approximately 40.6 MiB of raw RGBA
  pixels, excluding GPU copies, native overhead, overlays, and transient frames).
  Eviction drops references; it never explicitly disposes an image still held
  by a previous canvas commit.
- Cancel obsolete queued regions and pause queued work on navigation blur or
  background. In-flight loads remain bounded at two.
- The overview has an explicit retry action. Failed requests can retry after
  five seconds on a subsequent viewport request.
- World refreshes preserve references for unchanged data. Location descriptions
  are memoized separately from the discovery clock; offscreen people are culled.

Tiles are application assets, not a new online map service. Expo Go serves them
from Metro during development; installed builds include them. Discovery/API
connectivity is separate and still needs a reachable `EXPO_PUBLIC_API_URL`.

### Development and verification

`npm run dev:mobile -- --clear` now forwards `--clear` to Expo. Start/export
scripts check generated assets first and compile them when missing or when the
source campus geometry changes. After changing architectural generators, run
`npm run map:mobile` explicitly. Restart Metro after changing its resolver.

```powershell
npm run map:mobile
npm run lint --workspace=@breadcrumb/mobile
npm run typecheck --workspace=@breadcrumb/mobile
npm exec -- vitest run --maxWorkers=1 tests/mobile-map-tiles.test.ts tests/mobile-map-rendering.test.ts tests/mobile-map-performance.test.ts tests/mobile-discovery.test.ts tests/building-events.test.ts tests/post-location.test.ts tests/pixel.test.ts
# From apps/mobile:
npx expo export --platform ios --platform android --source-maps --max-workers 2
# From the repository root:
node scripts/verify-mobile-bundle.mjs
```

The bundle verifier checks actual Metro source maps for the mobile entry and
accidental walking/architectural-generator imports, and probes Hermes bytecode
for raw terrain, building, ground, walkway, and road geometry strings (JSON
modules themselves are omitted from Metro source maps). Native FPS,
startup time, thermal behavior, and process memory require release-build
measurement on the user's iPhone 14 Pro Max; no native FPS claim is established
by browser QA or a successful bundle export.

Verified for this migration:

- All 67 focused tests passed, including alpha-mask building hits against the
  original artwork, tile coverage across zooms/aspect ratios, cache eviction and
  concurrency, existing camera math, discovery, pixel art, and post locations.
- Root/mobile lint and TypeScript passed. The final mobile accessibility
  adjustment also passed mobile lint and TypeScript.
- iOS and Android Hermes exports passed. Their bytecode sizes were 6.17 MiB and
  6.34 MiB respectively; the native bundle verifier passed for both platforms.
- Generated imagery totals 13.8 MiB. The runtime geographic catalog is 1.37 MB;
  880 shared alpha masks plus building render metadata occupy about 627 KB.
- Playwright in isolated Edge, using empty world/discovery read fixtures, checked
  `http://localhost:8081` at 430x932 and 932x430. The Browser plugin was not
  available. Portrait/landscape screenshots were inspected; no framework overlay
  or app errors appeared. The existing Supabase `lock` deprecation warning
  remains. Browser tests made no live writes.
- Paced touch drag and two-finger pinch changed the camera; zoom buttons worked.
  Search -> Marston, direct building tap, Explore -> Ask -> Back camera
  restoration, and placement -> Cancel passed. Empty-feed map scenery uses
  images; the remaining nine SVG paths belong to UI icons.
- Startup asset validation passed, and `npm run dev:mobile -- --help` confirmed
  argument forwarding reaches `expo start --help` without the npm flag warning.

## Previous SVG implementation (historical measurements)

## Cause and implementation

The active map used React state for every pan/pinch event. Each movement rebuilt
screen-space markers and labels, updated a large SVG transform, and sometimes
rebuilt scenery during render. The initial view mounted 14,144 SVG paths.
Zoomed-out building rendering also ignored its `simple` setting.

The renderer still uses the existing campus artwork and SVG library. Changes:

- Gesture Handler and Reanimated run camera motion, pinch anchoring, and
  interruptible momentum on the UI thread. Only buffered scenery updates and the
  settled camera cross into React. Momentum stops on route blur/background and
  respects reduced motion.
- An overscanned scenery layer uses native texture caching on iOS and Android.
  Fixed-size markers, labels, placement target, and real people remain separate.
  The cached camera rebases during layout to keep geometry and overlays aligned.
- Building rectangles are flattened into nonoverlapping visible strips, then
  batched by color. Tests compare their output with the original painter order,
  including fractional coordinates. Sprite paths are cached by artwork identity.
- Ground surfaces use a spatial index; small buildings, trees, and detailed
  textures use less work at overview zoom. Detailed artwork returns on zoom-in.
- Hidden navigation layouts reporting 0×0 retain the last valid map viewport.

No dependencies, native projects, map engine, or artwork assets were added.

## Recorded comparison

Environment: local Expo web at `http://localhost:8081`, headless Chromium,
390×844 viewport, touch input, device scale factor 1. Same 60-move touch-drag
script before and after, with requestAnimationFrame intervals and a long-task
observer. These are browser measurements, **not iPhone FPS measurements**.

| Measurement | Before | After |
| --- | ---: | ---: |
| Initial SVG path count | 14,144 | 1,909 |
| 95th-percentile frame interval during drag | 166.6 ms | 16.8 ms |
| Worst observed frame interval | 316.7 ms | 216.6 ms |
| JavaScript tasks over 50 ms during drag | 63 | 3 |

The final browser run still had an outlier. The improvement does not establish
a sustained native frame-rate guarantee, and the shared development host was
also running compilation/tests. Repeated after-runs had 16.7–16.8 ms at the 95th
percentile. Live feed content can change the total path count by a few icons.

## Verification

- Root and mobile lint passed; root and mobile TypeScript passed.
- 21 tests passed across `mobile-map-rendering.test.ts` and
  `mobile-map-performance.test.ts`. They cover projection, pinch limits, buffered
  scenery, spatial indexing, painter order, and exact sprite coverage.
- iOS and Android Hermes bundle export passed.
- Browser interaction checks passed: pan, pinch, zoom buttons, no accidental
  posting from pan, Explore → Ask → Back camera restoration, explicit placement
  and Cancel. Portrait and landscape screenshots were inspected. This smoke run
  used explicitly empty discovery/world read fixtures and made no live writes.
- No app runtime errors appeared in the final interaction run. There remains an
  existing Supabase `lock` deprecation warning unrelated to map motion.
- A native Android launch was attempted, but the emulator's System UI timed out
  before meaningful native verification. This is not recorded as a passing
  native test or established as an app defect.
- Physical iPhone performance, thermal/memory behavior, and dense live-marker
  behavior remain to be measured on the user's device. Reload Expo Go before
  comparing so the new root gesture wrapper and worklets are active.

Regression commands, from the repository root:

```powershell
npm run lint --workspace=@breadcrumb/mobile
npm run typecheck --workspace=@breadcrumb/mobile
npm exec -- vitest run --maxWorkers=1 tests/mobile-map-rendering.test.ts tests/mobile-map-performance.test.ts
npm run export --workspace=@breadcrumb/mobile
```
