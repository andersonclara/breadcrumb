import { describe, expect, it } from 'vitest';
import { campusLamps, mapLightConfig, mapLightingOpacity } from '../apps/mobile/src/lib/map-lighting';

describe('exterior scenery lighting', () => {
  it('follows the saved appearance by default in development and release builds', () => {
    expect(mapLightConfig(undefined, true)).toEqual({ mode: 'appearance' });
    expect(mapLightConfig(undefined, false)).toEqual({ mode: 'appearance' });
    expect(mapLightConfig(null, false)).toEqual({ mode: 'appearance' });
    expect(mapLightConfig({ mode: 'fixtures' }, false)).toEqual({ mode: 'appearance' });
  });
  it('supports explicit development overrides without persisting them', () => {
    expect(mapLightConfig(null, true)).toBeNull();
    expect(mapLightConfig({ mode: 'fixtures' }, true)).toEqual({ mode: 'fixtures' });
    expect(mapLightConfig(undefined, true)).toEqual({ mode: 'appearance' });
  });
  it('keeps a small, finite set of unique campus-world fixtures', () => {
    expect(campusLamps.length).toBeGreaterThan(0);
    expect(campusLamps.length).toBeLessThanOrEqual(32);
    expect(new Set(campusLamps.map(p => `${p.x},${p.y}`)).size).toBe(campusLamps.length);
    for (const { x, y } of campusLamps) {
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
      expect(x >= 0 && x <= 320 && y >= 0 && y <= 320).toBe(true);
    }
  });
  it('does not place floodlight fixtures in the stadium field interior', () => {
    expect(campusLamps.some(p => p.x > 192 && p.x < 206 && p.y > 46 && p.y < 69)).toBe(false);
  });
  it('keeps daylight dark, dims twilight, and hides fixtures at distant zoom', () => {
    expect(mapLightingOpacity(0, 18)).toBe(0);
    expect(mapLightingOpacity(1, 4)).toBe(0);
    expect(mapLightingOpacity(1, 8)).toBe(1);
    expect(mapLightingOpacity(.4, 8)).toBe(.4);
    expect(mapLightingOpacity(1, 6)).toBe(.5);
  });
  it('bounds scalar opacity across zoom and rejects non-finite input', () => {
    for (let zoom = 1; zoom <= 42; zoom += .25) {
      const opacity = mapLightingOpacity(2, zoom);
      expect(opacity >= 0 && opacity <= 1).toBe(true);
    }
    expect(mapLightingOpacity(-1, 12)).toBe(0);
    expect(mapLightingOpacity(NaN, 12)).toBe(0);
    expect(mapLightingOpacity(1, Infinity)).toBe(0);
  });
});
