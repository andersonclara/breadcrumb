import { campus, fromWorld, inCampus, toWorld, defaultAvatar, type Coordinate, type World } from '@breadcrumb/shared';
import metadata from '../generated/map-catalog.json';
import type { MapCamera, MapSize } from './map-gesture';
import { tileBounds } from './map-tiles';

// Metadata contains shared alpha masks, never colored architectural pixels.
const buildings = metadata.buildings.map(b => ({ ...campus.buildings[b.index],
  width: b.width, artHeight: b.artHeight, mask: b.mask, landmark: b.landmark }));
const cells = new Map<string, number[]>();
buildings.forEach((b, index) => {
  for (let x = Math.floor((b.x - b.width / 2) / 4); x <= Math.floor((b.x + b.width / 2) / 4); x++)
    for (let y = Math.floor((b.y - b.artHeight) / 4); y <= Math.floor(b.y / 4); y++) {
      const key = `${x}:${y}`, cell = cells.get(key);
      if (cell) cell.push(index); else cells.set(key, [index]);
    }
});
export function hitTileBuilding(point: { x: number; y: number }) {
  const candidates = (cells.get(`${Math.floor(point.x / 4)}:${Math.floor(point.y / 4)}`) ?? [])
    .map(i => buildings[i]).sort((a, b) => b.y - a.y);
  for (const b of candidates) {
    const mask = metadata.masks[b.mask];
    const x = (point.x - b.x + b.width / 2) / b.width * mask.width;
    const y = (point.y - b.y + b.artHeight) / b.artHeight * mask.height;
    for (const row of mask.rows) {
      if (y < row[0] || y > row[1]) continue;
      for (let i = 2; i < row.length; i += 2) if (x >= row[i] && x <= row[i + 1]) return b;
    }
  }
  return null;
}
export function tileBuildingLabels(camera: MapCamera, size: MapSize) {
  const bounds = tileBounds(camera, size);
  return buildings.filter(b => (b.landmark || /marston|turlington|reitz|century|library west|^hub$/i.test(b.name)) &&
    b.x > bounds.left && b.x < bounds.right && b.y > bounds.top && b.y - b.artHeight < bounds.bottom);
}
export function mapPeople(world: World, position?: Coordinate | null) {
  const people = world.presence.filter(p => p.id !== world.profile?.id).map(p => ({ id: p.id, ...toWorld(p), avatar: p.avatar }));
  // A GPS fix is already approximate. Keep its geographic anchor without
  // scanning thousands of walkways whenever presence or UI state changes.
  if (position && inCampus(position)) people.push({ id: 'self', ...toWorld(position), avatar: world.profile?.avatar ?? defaultAvatar });
  return people;
}
export function buildingMapPoint(id: string) {
  const b = buildings.find(b => b.id === id);
  return b ? fromWorld(b.x, b.y) : null;
}
