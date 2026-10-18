import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { visibleMapTiles, wantedMapTiles, tileBounds, tileFromKey, tileImageRect, MAX_VISIBLE_TILES } from '../apps/mobile/src/lib/map-tiles';
import { TileCache } from '../apps/mobile/src/lib/tile-cache';
import { activeWorld, reconcileWorld } from '../packages/client/src/world-state';
import { emptyWorld, type World } from '@breadcrumb/shared';
import { campus, campusScene, hitBuildingSprite } from '@breadcrumb/shared';
import { hitTileBuilding } from '../apps/mobile/src/lib/map-catalog';

describe('streamed campus tile selection', () => {
  for (const size of [{ width: 430, height: 932 }, { width: 390, height: 700 }, { width: 1200, height: 600 }]) {
    for (const zoom of [1, 2, 5.9, 6, 12, 24, 128]) {
      it(`covers the buffered viewport within the texture budget at ${size.width}x${size.height}, zoom ${zoom}`, () => {
        for (const center of [{ x: 160, y: 160 }, { x: 0, y: 320 }, { x: 319, y: 1 }]) {
          const camera = { ...center, zoom }, tiles = visibleMapTiles(camera, size), view = tileBounds(camera, size);
          expect(tiles.length).toBeGreaterThan(0);
          expect(tiles.length).toBeLessThanOrEqual(MAX_VISIBLE_TILES);
          expect(wantedMapTiles(tiles).length).toBeLessThanOrEqual(40);
          for (const x of [Math.max(0, view.left) + .00001, Math.min(320, view.right) - .00001])
            for (const y of [Math.max(0, view.top) + .00001, Math.min(320, view.bottom) - .00001])
              expect(tiles.some(t => x >= t.left && x <= t.left + t.span && y >= t.top && y <= t.top + t.span)).toBe(true);
          for (const tile of tiles) {
            expect(tile.x).toBeGreaterThanOrEqual(0);
            expect(tile.y).toBeGreaterThanOrEqual(0);
            expect(tile.x).toBeLessThan(2 ** tile.level);
            expect(tile.y).toBeLessThan(2 ** tile.level);
          }
        }
      });
    }
  }
  it('retains an overview and parent fallback while detail loads', () => {
    const keys = wantedMapTiles([tileFromKey('5/12/9'), tileFromKey('5/13/9')]);
    expect(keys).toEqual(['0/0/0', '4/6/4', '5/12/9', '5/13/9']);
  });
  it('extends neighboring image samples across exact tile boundaries', () => {
    const a = tileImageRect(tileFromKey('5/0/0')), b = tileImageRect(tileFromKey('5/1/0'));
    expect(a.x + a.width).toBeGreaterThan(b.x);
    expect(a.width).toBeCloseTo(10 * 516 / 512);
  });
});

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
describe('bounded decoded tile cache', () => {
  it('limits parallel loads and abandons obsolete queued regions', async () => {
    const resolvers = new Map<string, (value: string) => void>();
    const loader = vi.fn((key: string) => new Promise<string>(resolve => resolvers.set(key, resolve)));
    const cache = new TileCache(loader, 4, 2);
    cache.request(['0/0/0', 'a', 'obsolete']);
    await flush();
    expect(loader.mock.calls.map(c => c[0])).toEqual(['0/0/0', 'a']);
    cache.request(['0/0/0', 'new']);
    resolvers.get('a')!('a'); await flush();
    expect(loader.mock.calls.map(c => c[0])).toEqual(['0/0/0', 'a', 'new']);
    expect(cache.pending).toBe(2);
    resolvers.get('0/0/0')!('overview'); resolvers.get('new')!('new'); await flush();
    expect(cache.pending).toBe(0);
    expect(cache.values().map(t => t.key)).not.toContain('obsolete');
  });
  it('evicts older regions, keeps the overview and never exceeds its asset budget', async () => {
    const cache = new TileCache(async key => key, 4, 2);
    for (let i = 0; i < 20; i++) {
      cache.request(['0/0/0', `region-${i}`]); await flush();
      expect(cache.size).toBeLessThanOrEqual(4);
      expect(cache.values().some(t => t.key === '0/0/0')).toBe(true);
    }
    expect(cache.values().some(t => t.key === 'region-0')).toBe(false);
    expect(cache.values().some(t => t.key === 'region-19')).toBe(true);
  });
  it('handles decoding failures, retries explicitly and pauses queued loads', async () => {
    let fails = true;
    const cache = new TileCache(async key => { if (fails) throw new Error('offline'); return key; }, 4, 1);
    cache.request(['0/0/0']); await flush();
    expect(cache.failed('0/0/0')).toBe(true);
    fails = false; cache.retry(); await flush();
    expect(cache.failed('0/0/0')).toBe(false);
    expect(cache.size).toBe(1);
    cache.suspend();
    expect(cache.pending).toBe(0);
  });
});

describe('world refresh structural sharing', () => {
  it('keeps unchanged data references but propagates votes and profile changes', () => {
    const world: World = { ...emptyWorld, friends: [], presence: [] };
    expect(reconcileWorld(world, structuredClone(world))).toBe(world);
    const updated = { ...world, profile: { id: 'self', handle: 'new', avatar: { skin: 0, hair: 0, shirt: 0, pants: 0, hairstyle: 0, top: 0, accessory: 0 }, avatar_completed: true, friend_code: 'abcd' } };
    const result = reconcileWorld(world, updated);
    expect(result.profile?.handle).toBe('new');
    expect(result.crumbs).toBe(world.crumbs);
    expect(activeWorld(result, Date.now())).toBe(result);
  });
  it('updates presence movement and expires old locations', () => {
    const person = { id: 'friend', handle: 'friend', avatar: { skin: 0, hair: 0, shirt: 0, pants: 0, hairstyle: 0, top: 0, accessory: 0 }, latitude: 29.64, longitude: -82.34, updated_at: '2026-01-01', expires_at: '2026-01-02' };
    const old = { ...emptyWorld, presence: [person] };
    const moved = reconcileWorld(old, { ...old, presence: [{ ...person, latitude: 29.65 }] });
    expect(moved.presence[0].moving).toBe(true);
    expect(activeWorld(moved, Date.parse('2026-01-03')).presence).toEqual([]);
    expect(moved.presence).toHaveLength(1);
  });
});

describe('mobile asset separation', () => {
  it('keeps the mobile catalog small and excludes colored geometry', () => {
    const source = fs.readFileSync('packages/shared/src/campus-mobile.json', 'utf8');
    const data = JSON.parse(source);
    expect(Buffer.byteLength(source)).toBeLessThan(2_000_000);
    expect(data.buildings.length).toBeGreaterThan(3000);
    expect(data.surfaces).toBeUndefined();
    expect(data.roads).toBeUndefined();
    expect(data.buildings.every((b: { path: string }) => b.path === '')).toBe(true);
    const entry = fs.readFileSync('packages/shared/src/index.mobile.ts', 'utf8');
    expect(entry).not.toMatch(/export .*from ['"]\.\/(walking|campus-landmarks|ground)['"]/);
  });
  it('preserves building taps and painter order after replacing colored pixels with alpha masks', () => {
    const samples = campus.buildings.filter(b => /^(Century Tower|Marston Science Library|Reitz Student Union|Norman Hall|Turlington Hall)$/.test(b.name));
    expect(samples.length).toBeGreaterThanOrEqual(4);
    for (const sample of samples) {
      const scene = campusScene(emptyWorld, false, 0, null, sample, 20)
        .filter((b): b is Extract<typeof b, { kind: 'building' }> => b.kind === 'building');
      for (let x = sample.x - 2; x < sample.x + 2; x += .419)
        for (let y = sample.y - 5; y < sample.y + 1; y += .617) {
          const point = { x, y };
          expect(hitTileBuilding(point)?.id).toBe(hitBuildingSprite(point, scene)?.id);
        }
    }
  });
});
