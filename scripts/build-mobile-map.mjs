// Offline asset compilation. No campus geometry or architectural generators run
// on the phone. Run from the repository root with `npm run map:mobile`.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { buildingArt } from '../packages/shared/src/building-art.ts';
import { identifyLandmark, campusLandmarkSprites } from '../packages/shared/src/campus-landmarks.ts';
import { canopyArt, frenchFriesArt } from '../packages/shared/src/landscape-art.ts';
import { groundMaterials } from '../packages/shared/src/ground-materials.ts';
import { MAP_STYLE_VERSION, mapDetail, silhouettePath, simpleSprite } from './mobile-map-style.mjs';

const root = path.resolve(import.meta.dirname, '..');
const source = await fs.readFile(path.join(root, 'packages/shared/src/campus-map.json'));
const geometryHash = createHash('sha256').update(source).digest('hex');
// Explicit migration mode for changes confined to overview styling. A changed
// campus source must always rebuild the detailed artwork too.
const reuseDetail = process.argv.includes('--reuse-detail');
if (reuseDetail) {
  const previous = await fs.readFile(path.join(root, 'apps/mobile/src/generated/map-assets.ts'), 'utf8');
  if (!previous.includes(`"geometryHash":"${geometryHash}"`) && !previous.includes(`"version":1,"sourceHash":"${geometryHash}"`))
    throw new Error('Campus geometry changed. Rebuild without --reuse-detail.');
}
const campus = JSON.parse(source);
const output = path.join(root, 'apps/mobile/assets/campus');
const generated = path.join(root, 'apps/mobile/src/generated');
await fs.mkdir(output, { recursive: true });
await fs.mkdir(generated, { recursive: true });
const tilePixels = 512, bleed = 2, maxLevel = 5;
const round = n => +n.toFixed(4);
const intersects = (a, b) => a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
const bounds = (points, pad = 0) => ({ left: Math.min(...points.map(p => p[0])) - pad,
  right: Math.max(...points.map(p => p[0])) + pad, top: Math.min(...points.map(p => p[1])) - pad,
  bottom: Math.max(...points.map(p => p[1])) + pad });
const pathBounds = (d, pad = 0) => {
  const values = d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  const points = []; for (let i = 0; i + 1 < values.length; i += 2) points.push([values[i], values[i + 1]]);
  return bounds(points, pad);
};
const rects = art => art.pixels.map(p => `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.color}"/>`).join('');
const terrain = campus.paths.flatMap((d, color) => (d.match(/M[^M]+/g) ?? []).map(path => {
  const r = /^M(-?[\d.]+) (-?[\d.]+)h(-?[\d.]+)v(-?[\d.]+)H-?[\d.]+z$/.exec(path);
  return { path, color, bounds: r ? bounds([[+r[1], +r[2]], [+r[1] + +r[3], +r[2] + +r[4]]]) :
    { left: -400, top: -400, right: 800, bottom: 800 } };
}));
const roads = campus.roads.map(p => ({ ...p, bounds: pathBounds(p.path, p.width / 2) }));
const walks = campus.walkways.map(p => ({ ...p, bounds: bounds(p.points, p.width / 2) }));
const masks = [], maskIds = new Map();
// Compact alpha coverage, including gaps, rather than shipping colored pixels
// merely to detect taps. Identical silhouettes share a mask across buildings.
function maskFor(art) {
  const ys = [...new Set(art.pixels.flatMap(p => [p.y, p.y + p.h]))].sort((a, b) => a - b);
  const rows = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const y = ys[i], bottom = ys[i + 1];
    const spans = art.pixels.filter(p => p.y <= y && p.y + p.h >= bottom && p.w > 0)
      .map(p => [p.x, p.x + p.w]).sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const span of spans) {
      const last = merged.at(-1);
      if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]); else merged.push([...span]);
    }
    if (!merged.length) continue;
    const edges = merged.flat().map(round), last = rows.at(-1);
    if (last && last[1] === round(y) && JSON.stringify(last.slice(2)) === JSON.stringify(edges)) last[1] = round(bottom);
    else rows.push([round(y), round(bottom), ...edges]);
  }
  const mask = { width: art.width, height: art.height, rows }, key = JSON.stringify(mask);
  if (!maskIds.has(key)) { maskIds.set(key, masks.length); masks.push(mask); }
  return maskIds.get(key);
}
const sprites = campus.buildings.map((b, index) => {
  const id = identifyLandmark(b.name), tower = id === 'century';
  const emphasis = id === 'malachowsky' ? 1.35 : id === 'west' || id === 'marston' ? 1.25 : 1;
  const art = id ? campusLandmarkSprites[id] : buildingArt(b);
  const height = tower ? (47.85 / campus.metersPerUnit + b.height) * 2 : Math.max(b.height + b.rise, b.width * .3) * emphasis;
  const width = tower ? Math.max(b.width, height * art.width / art.height) : b.width * emphasis;
  return { index, x: b.x, y: b.y, width, height, art, mask: maskFor(art), landmark: !!(b.landmark || id) };
});
const hitBuildings = sprites.map(b => ({ index: b.index, width: round(b.width), artHeight: round(b.height), mask: b.mask, landmark: b.landmark }));
const treeArt = [0, 1, 2].map(canopyArt);
for (const tree of campus.trees) sprites.push({ x: tree.x, y: tree.y, width: 1.05, height: 1.05, art: treeArt[tree.variant], tree: true });
const marston = campus.buildings.find(b => b.name === 'Marston Science Library');
if (marston) sprites.push({ x: marston.x - marston.width / 2 - .6, y: marston.y - .3,
  width: 15.24 / campus.metersPerUnit, height: 1.2, art: frenchFriesArt() });
sprites.sort((a, b) => a.y - b.y);
const artMasks = new WeakMap(), outlines = new Map();
for (const b of sprites) {
  b.bounds = { left: b.x - b.width / 2, right: b.x + b.width / 2, top: b.y - b.height, bottom: b.y };
  b.svg = `<g transform="translate(${b.x - b.width / 2} ${b.y - b.height}) scale(${b.width / b.art.width} ${b.height / b.art.height})">${rects(b.art)}</g>`;
  if (b.index === undefined && !b.tree) { b.overview = ''; b.blocks = ''; continue; }
  const maskId = b.mask ?? artMasks.get(b.art) ?? maskFor(b.art);
  artMasks.set(b.art, maskId);
  if (!outlines.has(maskId)) outlines.set(maskId, silhouettePath(masks[maskId].rows));
  const outline = outlines.get(maskId);
  const simple = level => `<g transform="translate(${b.x - b.width / 2} ${b.y - b.height}) scale(${b.width / b.art.width} ${b.height / b.art.height})">${simpleSprite(outline, b.landmark, level, b.tree)}</g>`;
  b.overview = b.tree || b.index === undefined ? '' : simple(0);
  b.blocks = b.index === undefined && !b.tree ? '' : simple(3);
}
const defs = Object.entries(groundMaterials).map(([id, m]) => `<pattern id="g-${id}" width="${m.size}" height="${m.size}" patternUnits="userSpaceOnUse"><rect width="${m.size}" height="${m.size}" fill="${m.color}"/><path d="${m.path}" fill="${m.detail}"/></pattern>`).join('');
const catalog = { size: campus.size, bounds: campus.bounds, colors: campus.colors, metersPerUnit: campus.metersPerUnit,
  buildings: campus.buildings.map(b => ({ id: b.id, name: b.name, x: b.x, y: b.y, width: b.width, height: b.height, rise: b.rise,
    path: '', buildingNumber: b.buildingNumber ?? null })),
  walkways: campus.walkways.map(p => ({ points: p.points.map(p => p.map(round)) })) };
await fs.writeFile(path.join(root, 'packages/shared/src/campus-mobile.json'), JSON.stringify(catalog));
await fs.writeFile(path.join(generated, 'map-catalog.json'), JSON.stringify({ buildings: hitBuildings, masks }));
let totalBytes = 0;
const assets = [];
// Limit simultaneous SVG rasterizations. Each image is independent, with a
// two-pixel gutter sampled from the neighboring region to prevent tile seams.
for (let level = 0; level <= maxLevel; level++) {
  const count = 2 ** level, span = campus.size / count, pad = span * bleed / tilePixels;
  const tasks = [];
  for (let y = 0; y < count; y++) for (let x = 0; x < count; x++) tasks.push({ x, y });
  if (reuseDetail && level === maxLevel) {
    for (const { x, y } of tasks) {
      const name = `${level}-${x}-${y}.png`;
      totalBytes += (await fs.stat(path.join(output, name))).size;
      assets.push({ key: `${level}/${x}/${y}`, name });
    }
    console.log(`Retained ${tasks.length} unchanged close-up tiles`);
    continue;
  }
  let cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < tasks.length) {
      const { x, y } = tasks[cursor++], left = x * span - pad, top = y * span - pad;
      const view = { left, top, right: (x + 1) * span + pad, bottom: (y + 1) * span + pad };
      const features = terrain.filter(p => intersects(p.bounds, view)).map(p => `<path d="${p.path}" fill="${campus.colors[p.color]}"/>`).join('') +
        roads.filter(p => intersects(p.bounds, view)).map(p => `<path d="${p.path}" fill="none" stroke="#C4B594" stroke-width="${p.width}" stroke-linecap="round"/>`).join('') +
        walks.filter(p => (level >= 3 || p.width >= .2) && intersects(p.bounds, view)).map(p => `<path d="${p.path}" fill="none" stroke="#FFE7B1" stroke-width="${p.width}" stroke-linecap="round"/>`).join('') +
        campus.surfaces.filter(p => intersects(p, view)).map(p => `<path d="${p.path}" fill="${level < 5 ? (groundMaterials[p.material] ?? groundMaterials.unknown).color : `url(#g-${p.material in groundMaterials ? p.material : 'unknown'})`}" fill-rule="evenodd"/>`).join('') +
        sprites.filter(b => intersects(b.bounds, view)).map(b => mapDetail(level) === 'detail' ? b.svg : level < 3 ? b.overview : b.blocks).join('');
      const pixels = tilePixels + bleed * 2;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pixels}" height="${pixels}" viewBox="${left} ${top} ${span + pad * 2} ${span + pad * 2}" shape-rendering="crispEdges"><defs>${defs}</defs><rect x="${left}" y="${top}" width="${span + pad * 2}" height="${span + pad * 2}" fill="${campus.colors[0]}"/>${features}</svg>`;
      const name = `${level}-${x}-${y}.png`;
      const png = await sharp(Buffer.from(svg), { limitInputPixels: false }).png({ palette: true, colours: 256 }).toBuffer();
      const destination = path.join(output, name);
      const previous = await fs.readFile(destination).catch(() => null);
      // Avoid repeatedly invalidating a running Metro server for identical assets.
      if (!previous?.equals(png)) await fs.writeFile(destination, png);
      totalBytes += png.length; assets.push({ key: `${level}/${x}/${y}`, name });
    }
  }));
  console.log(`Compiled map level ${level}: ${count * count} tiles`);
}
assets.sort((a, b) => a.key.localeCompare(b.key));
const hash = createHash('sha256').update(source)
  .update(await fs.readFile(new URL('./build-mobile-map.mjs', import.meta.url)))
  .update(await fs.readFile(new URL('./mobile-map-style.mjs', import.meta.url))).digest('hex');
await fs.writeFile(path.join(generated, 'map-assets.ts'), `/* Generated by npm run map:mobile. Asset references do not decode images. */\nexport const mapAssetInfo = ${JSON.stringify({ version: MAP_STYLE_VERSION, sourceHash: hash, geometryHash, tilePixels, bleed, maxLevel, tileCount: assets.length, encodedBytes: totalBytes })} as const;\nexport const mapAssets: Record<string, number> = {\n${assets.map(a => `  "${a.key}": require("../../assets/campus/${a.name}"),`).join('\n')}\n};\n`);
console.log(`Built ${assets.length} tiles (${(totalBytes / 1048576).toFixed(1)} MiB), ${masks.length} shared hit masks.`);
