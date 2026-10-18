import { describe, expect, it } from 'vitest';
import { mapLight, lightAtAltitude } from '../apps/mobile/src/lib/map-appearance';
import { mapUITheme } from '../apps/mobile/src/lib/map-ui-theme';
import { theme } from '../apps/mobile/src/lib/theme';

function contrast(a: string, b: string) {
  const luminance = (hex: string) => [1, 3, 5].reduce((sum, offset, index) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    const linear = value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    return sum + linear * [.2126, .7152, .0722][index];
  }, 0);
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

describe('map interface appearance', () => {
  const state = { mode: 'night' as const, light: mapLight('night'), ready: true, enabled: true };
  it('matches the map startup, Original, and unsupported-platform gates', () => {
    expect(mapUITheme({ ...state, ready: false })).toBe(theme);
    expect(mapUITheme({ ...state, enabled: false })).toBe(theme);
    expect(mapUITheme({ ...state, mode: 'original' })).toBe(theme);
    expect(mapUITheme({ ...state, mode: 'day', light: mapLight('day') })).toBe(theme);
  });
  it('follows automatic campus daylight and preserves the gold action contrast at night', () => {
    const at = (date: string) => mapUITheme({ ...state, mode: 'auto', light: mapLight('auto', new Date(date)) });
    expect(at('2026-10-18T17:00:00Z')).toBe(theme);
    const dark = at('2026-10-18T05:00:00Z');
    expect(dark.surface).not.toBe(theme.surface);
    expect(dark.ink).toBe('#FFF7E8');
    expect(dark.toast).toBe(theme.toast);
    expect(contrast(dark.buttonInk, dark.toast)).toBeGreaterThanOrEqual(4.5);
  });
  it('keeps normal, secondary, and feedback text readable throughout sunrise and sunset', () => {
    for (let altitude = -10; altitude <= 10; altitude += .05) {
      const palette = mapUITheme({ ...state, mode: 'auto', light: lightAtAltitude(altitude) });
      for (const color of [palette.ink, palette.muted]) {
        for (const background of [palette.surface, palette.background, palette.sage, palette.crumbSurface]) {
          expect(contrast(color, background), `sun altitude ${altitude}: ${color} on ${background}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(contrast(palette.danger, palette.dangerSurface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette.success, palette.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
