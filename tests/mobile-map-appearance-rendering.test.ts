import { describe, expect, it } from 'vitest';
import { mapAppearances, mapLight } from '../apps/mobile/src/lib/map-appearance';
import { mapAppearanceMatrix } from '../apps/mobile/src/lib/map-appearance-rendering';

const night = { day: 0, dusk: 0, night: 1 };
describe('native appearance startup and recovery', () => {
  it('never filters before the preference is ready, including a saved Night choice', () => {
    for (const { id } of mapAppearances) {
      expect(mapAppearanceMatrix({ mode: id, light: night, ready: false, enabled: true })).toBeUndefined();
    }
  });
  it('keeps Original unfiltered regardless of the calculated light', () => {
    expect(mapAppearanceMatrix({ mode: 'original', light: night, ready: true, enabled: true })).toBeUndefined();
    expect(mapLight('original')).toEqual({ day: 1, dusk: 0, night: 0 });
  });
  it('keeps unsupported renderers unfiltered even after loading a preference', () => {
    for (const { id } of mapAppearances) {
      expect(mapAppearanceMatrix({ mode: id, light: night, ready: true, enabled: false })).toBeUndefined();
    }
  });
  it('produces finite alpha-preserving matrices for ready manual and solar appearances', () => {
    for (const mode of ['auto', 'day', 'dusk', 'night'] as const) {
      const matrix = mapAppearanceMatrix({ mode, light: mapLight(mode, new Date('2026-10-18T05:00:00Z')), ready: true, enabled: true })!;
      expect(matrix).toHaveLength(20);
      expect(matrix.every(Number.isFinite)).toBe(true);
      expect(matrix.slice(15)).toEqual([0, 0, 0, 1, 0]);
    }
  });
});
