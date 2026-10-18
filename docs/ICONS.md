# Pixel category icons

Breadcrumb marks *what* is happening (food, hazards, events…) with small pixel icons that match the bread, toast, and avatar art. Each icon is a 16×16 grid stored as code (`PixelRect[]`) and drawn as SVG at runtime; there are no image files.

They share one palette: ink `#493E48` for outlines, cream `#FFF1DA` for highlights, plus colors close to each category's `color` in `packages/shared/src/constants.ts`.

## Where they live

- [`packages/shared/src/category-icons.ts`](../packages/shared/src/category-icons.ts) holds the pixel data.
  - `categoryIconPixels(name)` returns an icon's squares. Unknown names fall back to the pizza.
  - `iconForRecord(record)` picks the icon for a discovery: events always get `calendar`; a crumb gets its category, or `freebie` when the category is unknown.
  - `PixelIconName` lists the valid names: the six crumb categories plus `calendar` and `warning`.
- [`apps/mobile/src/components/pixel-art.tsx`](../apps/mobile/src/components/pixel-art.tsx) holds the React Native components, next to `BreadGlyph`, `PixelBread`, and `PixelAvatar`.
  - `CategoryGlyph({ name })` is the bare `<G>`, for use inside an existing `<Svg>`. It batches the squares into one `<Path>` per color via `spritePaths` (`apps/mobile/src/lib/map-sprites.ts`).
  - `PixelIcon({ name, size })` is a standalone icon with an accessibility label.
  - `DiscoveryGlyph({ record, state })` and `PixelDiscovery` draw the category icon with a **bread badge** in the bottom-right corner for crumbs. The badge shows how confirmed the report is (crumb → rising → full loaf → burnt). Events have no badge.

## Where they appear

| Place | File | Component |
|---|---|---|
| Map pins (single discovery) | `apps/mobile/src/components/campus-map.tsx` | `DiscoveryGlyph` |
| List rows | `apps/mobile/src/components/discovery-row.tsx` | `PixelDiscovery` |
| Detail sheet eyebrow | `apps/mobile/src/components/discovery-detail.tsx` | `PixelIcon` (40px) |
| Category chips in the filters sheet | `apps/mobile/src/app/(tabs)/index.tsx` | `PixelIcon` via `Chip`'s `icon` prop |
| Category chips in the Post-a-Crumb composer | `apps/mobile/src/components/crumb-composer.tsx` | `PixelIcon` via `Chip`'s `icon` prop |
| Filter pill when a category is selected | `apps/mobile/src/app/(tabs)/index.tsx` | `PixelIcon` |
| Error messages | `Feedback` in `apps/mobile/src/components/game-ui.tsx` | `PixelIcon name="warning"` |
| Full Loaf posts in the building sheet | `apps/mobile/src/components/building-events.tsx` | `PixelDiscovery` (full-loaf badge) |

Cluster pins (several discoveries at one spot) still show a count. The general line icons in `icon.tsx` (search, close, chevron…) are separate and stay vector.

## The icons

Each emoji square is one pixel. The colors are approximate. Blank rows at the top and bottom are trimmed.

### `calendar` (alias `event`): Events and scheduled events
```
▫️▫️▫️▫️▫️⬛⬛▫️▫️⬛⬛▫️▫️▫️▫️▫️
▫️▫️▫️▫️▫️⬛⬛▫️▫️⬛⬛▫️▫️▫️▫️▫️
▫️▫️⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛▫️▫️
▫️▫️⬛🟥🟥⬛⬛🟥🟥⬛⬛🟥🟥⬛▫️▫️
▫️▫️⬛🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥⬛▫️▫️
▫️▫️⬛🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥⬛▫️▫️
▫️▫️⬛⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬛▫️▫️
▫️▫️⬛⬜🟫🟫⬜🟫🟫⬜🟫🟫⬜⬛▫️▫️
▫️▫️⬛⬜🟫🟫⬜🟫🟫⬜🟫🟫⬜⬛▫️▫️
▫️▫️⬛⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬛▫️▫️
▫️▫️⬛⬜🟫🟫⬜🟫🟫⬜🟥🟥⬜⬛▫️▫️
▫️▫️⬛⬜🟫🟫⬜🟫🟫⬜🟥🟥⬜⬛▫️▫️
▫️▫️⬛⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬛▫️▫️
▫️▫️⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛▫️▫️
```

### `freebie`: Freebies (pizza slice)
```
▫️⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛▫️
▫️⬛🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧⬛▫️
▫️⬛🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫⬛▫️
▫️⬛🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨⬛▫️
▫️▫️⬛🟨🟨🟥🟥🟨🟨🟨🟨🟧🟧⬛▫️▫️
▫️▫️⬛🟨🟨🟥🟥🟨🟨🟥🟥🟨🟨⬛▫️▫️
▫️▫️▫️⬛🟨🟨🟨🟨🟨🟥🟥🟨⬛▫️▫️▫️
▫️▫️▫️⬛🟨🟨🟨🟨🟨🟨🟧🟨⬛▫️▫️▫️
▫️▫️▫️▫️⬛🟨🟨🟥🟥🟨🟧⬛▫️▫️▫️▫️
▫️▫️▫️▫️⬛🟨🟨🟥🟥🟨🟨⬛▫️▫️▫️▫️
▫️▫️▫️▫️▫️⬛🟨🟨🟨🟨⬛▫️▫️▫️▫️▫️
▫️▫️▫️▫️▫️⬛🟨🟨🟨🟨⬛▫️▫️▫️▫️▫️
▫️▫️▫️▫️▫️▫️⬛🟨🟨⬛▫️▫️▫️▫️▫️▫️
▫️▫️▫️▫️▫️▫️▫️⬛⬛▫️▫️▫️▫️▫️▫️▫️
```

### `crowd`: Crowds & Lines

> Needs polish: the middle head runs into the outlines of the two people behind it, so the icon reads as a blob at pin size.
```
▫️⬛⬛⬛⬛⬛⬛▫️▫️⬛⬛⬛⬛⬛⬛▫️
▫️⬛🟫🟫🟫🟫⬛▫️▫️⬛🟫🟫🟫🟫⬛▫️
▫️⬛🟨🟨🟨🟨⬛▫️▫️⬛🟨🟨🟨🟨⬛▫️
▫️⬛🟨🟨🟨⬛⬛⬛⬛⬛⬛🟨🟨🟨⬛▫️
▫️⬛🟨🟨🟨⬛🟫🟫🟫🟫⬛🟨🟨🟨⬛▫️
▫️⬛⬛⬛⬛⬛🟨🟨🟨🟨⬛⬛⬛⬛⬛▫️
⬛⬛⬛⬛⬛⬛🟨🟨🟨🟨⬛⬛⬛⬛⬛⬛
⬛⬜⬜⬜⬜⬛🟨🟨🟨🟨⬛⬜⬜⬜⬜⬛
⬛🟦🟦🟦🟦⬛⬛⬛⬛⬛⬛🟩🟩🟩🟩⬛
⬛🟦🟦🟦⬛⬛⬛⬛⬛⬛⬛⬛🟩🟩🟩⬛
⬛🟦🟦🟦⬛⬜⬜⬜⬜⬜⬜⬛🟩🟩🟩⬛
⬛🟦🟦🟦⬛🟧🟧🟧🟧🟧🟧⬛🟩🟩🟩⬛
⬛🟦🟦🟦⬛🟧🟧🟧🟧🟧🟧⬛🟩🟩🟩⬛
⬛🟦🟦🟦⬛🟧🟧🟧🟧🟧🟧⬛🟩🟩🟩⬛
```

### `construction`: Construction (traffic cone)
```
▫️▫️▫️▫️▫️▫️▫️⬛⬛▫️▫️▫️▫️▫️▫️▫️
▫️▫️▫️▫️▫️▫️⬛🟧🟧⬛▫️▫️▫️▫️▫️▫️
▫️▫️▫️▫️▫️▫️⬛🟧🟧⬛▫️▫️▫️▫️▫️▫️
▫️▫️▫️▫️▫️⬛🟧🟧🟧🟧⬛▫️▫️▫️▫️▫️
▫️▫️▫️▫️▫️⬛⬜⬜⬜⬜⬛▫️▫️▫️▫️▫️
▫️▫️▫️▫️⬛🟧🟧🟧🟧🟧🟧⬛▫️▫️▫️▫️
▫️▫️▫️▫️⬛🟧🟧🟧🟧🟧🟧⬛▫️▫️▫️▫️
▫️▫️▫️⬛🟧🟧🟧🟧🟧🟧🟧🟧⬛▫️▫️▫️
▫️▫️▫️⬛⬜⬜⬜⬜⬜⬜⬜⬜⬛▫️▫️▫️
▫️▫️⬛🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧⬛▫️▫️
▫️▫️⬛🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧⬛▫️▫️
▫️⬛🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪⬛▫️
▫️⬛🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪🟪⬛▫️
▫️⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛▫️
```

### `warning` (alias `hazard`): Hazards and error messages
```
▫️▫️▫️▫️▫️▫️▫️⬛⬛▫️▫️▫️▫️▫️▫️▫️
▫️▫️▫️▫️▫️▫️⬛🟨🟨⬛▫️▫️▫️▫️▫️▫️
▫️▫️▫️▫️▫️▫️⬛🟨🟨⬛▫️▫️▫️▫️▫️▫️
▫️▫️▫️▫️▫️⬛🟨🟨🟨🟨⬛▫️▫️▫️▫️▫️
▫️▫️▫️▫️▫️⬛🟨🟨🟨🟨⬛▫️▫️▫️▫️▫️
▫️▫️▫️▫️⬛🟨🟨⬛⬛🟨🟨⬛▫️▫️▫️▫️
▫️▫️▫️▫️⬛🟨🟨⬛⬛🟨🟨⬛▫️▫️▫️▫️
▫️▫️▫️⬛🟨🟨🟨⬛⬛🟨🟨🟨⬛▫️▫️▫️
▫️▫️▫️⬛🟨🟨🟨⬛⬛🟨🟨🟨⬛▫️▫️▫️
▫️▫️⬛🟨🟨🟨🟨⬛⬛🟨🟨🟨🟨⬛▫️▫️
▫️▫️⬛🟨🟨🟨🟨🟨🟨🟨🟨🟨🟨⬛▫️▫️
▫️⬛🟨🟨🟨🟨🟨⬛⬛🟨🟨🟨🟨🟨⬛▫️
▫️⬛🟨🟨🟨🟨🟨⬛⬛🟨🟨🟨🟨🟨⬛▫️
⬛🟨🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟨⬛
⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛
```

### `sighting`: Sightings (eye)

> Needs polish: the eye sits in the top two-thirds of the grid, and the lashes float above it.
```
▫️▫️▫️▫️▫️▫️▫️⬛⬛▫️▫️▫️▫️▫️▫️▫️
▫️▫️▫️▫️⬛▫️▫️⬛⬛▫️▫️⬛▫️▫️▫️▫️
▫️▫️▫️▫️⬛▫️▫️▫️▫️▫️▫️⬛▫️▫️▫️▫️
▫️▫️▫️▫️▫️⬛⬛⬛⬛⬛⬛▫️▫️▫️▫️▫️
▫️▫️▫️⬛⬛⬜⬜🟪🟪⬜⬜⬛⬛▫️▫️▫️
▫️▫️⬛⬜⬜⬜🟪🟪🟪🟪⬜⬜⬜⬛▫️▫️
▫️⬛⬜⬜⬜⬜🟪⬛⬜🟪⬜⬜⬜⬜⬛▫️
▫️⬛⬜⬜⬜⬜🟪⬛⬛🟪⬜⬜⬜⬜⬛▫️
▫️▫️⬛⬜⬜⬜🟪🟪🟪🟪⬜⬜⬜⬛▫️▫️
▫️▫️▫️⬛⬛⬜⬜🟪🟪⬜⬜⬛⬛▫️▫️▫️
▫️▫️▫️▫️▫️⬛⬛⬛⬛⬛⬛▫️▫️▫️▫️▫️
```

## Editing an icon

Each icon is a list of `[x, y, width, height, color]` squares on a 0–16 grid; `x` and `y` are the top-left corner. Squares later in the list paint over earlier ones. The `outlinedRows` helper draws a row with a one-pixel ink outline on each side, which is how the pizza, cone, and warning get their outlines.

```ts
const calendar = rects([
  [2, 3, 12, 12, ink],        // outline
  [3, 4, 10, 10, cream],      // page
  [3, 4, 10, 3, '#E0614A'],   // red header
  // ...
]);
```

## Adding an icon

1. Draw it as a new module-level constant in `category-icons.ts`. Keep it outside any function: renderers cache the sprite paths by array identity, so building a new array on each call defeats the cache.
2. Add its name to `PixelIconName` and to the `icons` record. A new crumb category added to `categories` in `constants.ts` is picked up by the type automatically, but still needs an entry in `icons`.
3. Run `npx vitest run tests/category-icons.test.ts`. It checks that every icon is non-empty and stays inside the 16×16 grid, that the arrays are stable, and that `iconForRecord` maps records correctly.
4. Check the icon at map-pin size in the app: `npm run dev:mobile`, then tap **Demo** to fill the map with every category.

## Regenerating these previews

Run this from the repo root. It uses `jiti`, which is already installed, to load the TypeScript directly. Add an entry to `emoji` for any new color.

```js
// node preview.cjs [name ...]
const { createJiti } = require(require.resolve("jiti", { paths: [process.cwd()] }));
const { categoryIconPixels } = createJiti(process.cwd() + "/")("./packages/shared/src/category-icons.ts");
const emoji = { "#493E48": "⬛", "#FFF1DA": "⬜", "#E3CFAE": "⬜", "#C9B9A4": "🟫", "#E0614A": "🟥", "#F28A6F": "🟥",
  "#C9803A": "🟫", "#E6A85A": "🟧", "#FFC65A": "🟨", "#F0A93E": "🟧", "#C8463A": "🟥", "#E06A55": "🟥", "#689ECB": "🟦",
  "#68B67F": "🟩", "#EE896A": "🟧", "#F1C7A0": "🟨", "#382C2B": "🟫", "#EE7A3A": "🟧", "#F7A060": "🟧", "#7A6470": "🟪",
  "#9A8490": "🟪", "#F5C445": "🟨", "#D9A12F": "🟧", "#76628A": "🟪", "#A08BB5": "🟪" };
const names = process.argv.slice(2);
for (const name of names.length ? names : ["calendar", "freebie", "crowd", "construction", "warning", "sighting"]) {
  const grid = Array.from({ length: 16 }, () => Array(16).fill("▫️"));
  for (const p of categoryIconPixels(name))
    for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) grid[y][x] = emoji[p.color] ?? "❓";
  console.log(`### ${name}\n` + grid.map((r) => r.join("")).filter((r) => r !== "▫️".repeat(16)).join("\n") + "\n");
}
```
