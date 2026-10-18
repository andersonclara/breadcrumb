import type { MapCamera, MapSize } from '@breadcrumb/shared';

export const TILE_PIXELS = 512;
export const TILE_BLEED = 2;
export const MAX_TILE_LEVEL = 5;
export const MAX_VISIBLE_TILES = 24;
export const OVERVIEW_TILE = '0/0/0';
export type MapTile = { key: string; level: number; x: number; y: number; span: number; left: number; top: number };

export function tileFromKey(key: string): MapTile {
  const [level, x, y] = key.split('/').map(Number);
  const span = 320 / 2 ** level;
  return { key, level, x, y, span, left: x * span, top: y * span };
}
export function tileBounds(camera: MapCamera, size: MapSize, buffer = 1.8) {
  const scale = Math.max(size.width, size.height, 1) * camera.zoom / 320;
  const halfWidth = size.width * buffer / scale / 2, halfHeight = size.height * buffer / scale / 2;
  return { left: camera.x - halfWidth, right: camera.x + halfWidth, top: camera.y - halfHeight, bottom: camera.y + halfHeight };
}
function atLevel(level: number, camera: MapCamera, size: MapSize): MapTile[] {
  const b = tileBounds(camera, size), count = 2 ** level, span = 320 / count;
  const result: MapTile[] = [];
  for (let y = Math.max(0, Math.floor(b.top / span)); y <= Math.min(count - 1, Math.floor(b.bottom / span)); y++) {
    for (let x = Math.max(0, Math.floor(b.left / span)); x <= Math.min(count - 1, Math.floor(b.right / span)); x++) {
      result.push(tileFromKey(`${level}/${x}/${y}`));
    }
  }
  return result.sort((a, b) => Math.hypot(a.left + span / 2 - camera.x, a.top + span / 2 - camera.y) -
    Math.hypot(b.left + span / 2 - camera.x, b.top + span / 2 - camera.y));
}
export function visibleMapTiles(camera: MapCamera, size: MapSize, density = 2, maxLevel = MAX_TILE_LEVEL): MapTile[] {
  // Floor avoids decoding four times as many textures for a tiny zoom change.
  // Source pixels intentionally enlarge at close zoom to retain pixel artwork.
  let level = Math.max(0, Math.min(maxLevel, MAX_TILE_LEVEL,
    Math.floor(Math.log2(Math.max(size.width, size.height, 1) * camera.zoom * density / TILE_PIXELS))));
  let tiles = atLevel(level, camera, size);
  while (tiles.length > MAX_VISIBLE_TILES && level > 0) tiles = atLevel(--level, camera, size);
  return tiles;
}
export function wantedMapTiles(tiles: MapTile[]): string[] {
  const parents = tiles.filter(t => t.level > 0).map(t => `${t.level - 1}/${Math.floor(t.x / 2)}/${Math.floor(t.y / 2)}`);
  return [...new Set([OVERVIEW_TILE, ...parents, ...tiles.map(t => t.key)])];
}
export function tileIntersectsView(tile: MapTile, camera: MapCamera, size: MapSize) {
  const b = tileBounds(camera, size);
  return tile.left < b.right && tile.left + tile.span > b.left && tile.top < b.bottom && tile.top + tile.span > b.top;
}
export function tileImageRect(tile: MapTile) {
  const pad = tile.span * TILE_BLEED / TILE_PIXELS;
  return { x: tile.left - pad, y: tile.top - pad, width: tile.span + 2 * pad, height: tile.span + 2 * pad };
}
