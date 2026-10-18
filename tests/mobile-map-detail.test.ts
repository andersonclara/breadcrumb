import { describe, expect, it } from 'vitest';
import { cachedMapTiles, mapTileLevel, mapTileOpacity, visibleMapTiles } from '../apps/mobile/src/lib/map-tiles';
import { mapDetail, silhouettePath } from '../scripts/mobile-map-style.mjs';

const size = { width: 390, height: 844 };
const camera = { x: 145, y: 115, zoom: 12 };
const entries = ['0/0/0', '3/3/2', '4/7/5', '5/14/11'].map(key => ({ key, value: key }));
describe('map detail follows the visible scale', () => {
  it('uses quiet outlines before revealing full pixel artwork', () => {
    expect([0, 1, 2].map(mapDetail)).toEqual(['overview', 'overview', 'overview']);
    expect([3, 4, 5].map(mapDetail)).toEqual(['detail', 'detail', 'detail']);
  });
  it('selects full artwork one tile level sooner at half the previous zoom', () => {
    const previousThreshold = 512 * 32 / (size.height * 2);
    const earlier = { ...camera, zoom: previousThreshold / 4 + .01 };
    expect(mapDetail(mapTileLevel(earlier, size))).toBe('detail');
    expect(mapDetail(mapTileLevel({ ...earlier, zoom: earlier.zoom / 2 }, size))).toBe('overview');
    // The actual budgeted scheduler must select the richer assets too.
    expect(visibleMapTiles({ ...camera, zoom: 6 }, size).every(t => mapDetail(t.level) === 'detail')).toBe(true);
  });
  it('does not redraw cached close-up artwork when zooming back out', () => {
    const close = cachedMapTiles(entries, camera, size, mapTileLevel(camera, size));
    expect(close.map(t => t.key)).toContain('5/14/11');
    const mid = { ...camera, zoom: 5 };
    expect(cachedMapTiles(entries, mid, size, mapTileLevel(mid, size)).map(t => t.key))
      .toEqual(['0/0/0', '3/3/2', '4/7/5']);
    const far = { ...camera, zoom: 2 };
    expect(cachedMapTiles(entries, far, size, mapTileLevel(far, size)).map(t => t.key)).toEqual(['0/0/0']);
  });
  it('ignores a detailed tile that finishes decoding after the user zoomed out', () => {
    const far = { ...camera, zoom: 2 }, level = mapTileLevel(far, size);
    const before = cachedMapTiles(entries.slice(0, -1), far, size, level);
    expect(cachedMapTiles(entries, far, size, level)).toEqual(before);
  });
  it('hides detail on the current UI frame and reveals it progressively on zoom-in', () => {
    expect(mapTileOpacity(5, { ...camera, zoom: 3 }, size)).toBe(0);
    const threshold = 512 * 32 / (size.height * 2);
    expect(mapTileOpacity(5, { ...camera, zoom: threshold }, size)).toBe(0);
    const midway = mapTileOpacity(5, { ...camera, zoom: threshold * 1.1 }, size);
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(1);
    expect(mapTileOpacity(5, { ...camera, zoom: threshold * 1.3 }, size)).toBe(1);
    expect(mapTileOpacity(0, { ...camera, zoom: 1 }, size)).toBe(1);
  });
  it('reveals detail at the same on-screen building size on phones and tablets', () => {
    const tablet = { width: 1200, height: 800 }, equivalent = { ...camera, zoom: camera.zoom * 844 / 1200 };
    expect(mapTileLevel(equivalent, tablet)).toBe(mapTileLevel(camera, size));
    expect(mapTileOpacity(5, equivalent, tablet)).toBeCloseTo(mapTileOpacity(5, camera, size));
  });
  it('keeps the original outer building contour while omitting internal pixel gaps', () => {
    const path = silhouettePath([[0, 2, 2, 5, 8, 12], [2, 4, 2, 12], [4, 5, 4, 10]]);
    expect(path).toBe('M12 0L12 4L10 4L10 5L4 5L4 4L2 4L2 0Z');
    expect(silhouettePath([])).toBe('');
  });
});
