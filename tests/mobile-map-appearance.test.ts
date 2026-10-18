import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';
import type { CanvasKit } from 'canvaskit-wasm';
import { campusSunAltitude, lightAtAltitude, mapLight } from '../apps/mobile/src/lib/map-appearance';
import { mapColorMatrix } from '../apps/mobile/src/lib/map-palette';

describe('campus daylight', () => {
  it('uses Gainesville daylight independently of the device timezone', () => {
    expect(campusSunAltitude(new Date('2026-06-21T17:30:00Z'))).toBeGreaterThan(80);
    expect(campusSunAltitude(new Date('2026-12-21T17:30:00Z'))).toBeLessThan(40);
    expect(mapLight('auto', new Date('2026-10-18T17:00:00Z')).day).toBe(1);
    expect(mapLight('auto', new Date('2026-10-18T05:00:00Z')).night).toBe(1);
    expect(mapLight('auto', new Date('2026-10-18T13:00:00-04:00')))
      .toEqual(mapLight('auto', new Date('2026-10-18T17:00:00Z')));
  });
  it('blends continuously through twilight with normalized nonnegative weights', () => {
    for (let altitude = -90; altitude <= 90; altitude += .25) {
      const light = lightAtAltitude(altitude), next = lightAtAltitude(altitude + .01);
      expect(light.day + light.dusk + light.night).toBeCloseTo(1);
      for (const key of ['day', 'dusk', 'night'] as const) {
        expect(light[key]).toBeGreaterThanOrEqual(0);
        expect(Math.abs(next[key] - light[key])).toBeLessThan(.003);
      }
    }
  });
  it('honors previews regardless of actual time', () => {
    expect(mapLight('night', new Date('2026-10-18T17:00:00Z'))).toEqual({ day: 0, dusk: 0, night: 1 });
    expect(mapLight('day', new Date('2026-10-18T05:00:00Z'))).toEqual({ day: 1, dusk: 0, night: 0 });
  });
});

describe('production map palette in Skia', () => {
  let kit: CanvasKit;
  beforeAll(async () => {
    const require = createRequire(import.meta.url);
    const initialize = require('canvaskit-wasm/bin/full/canvaskit.js');
    kit = await initialize({ locateFile: (file: string) => require.resolve(`canvaskit-wasm/bin/full/${file}`) });
  });
  const sample = (hex: string, light: number[]) => {
    const filter = kit.ColorFilter.MakeMatrix(mapColorMatrix(light));
    const surface = kit.MakeSurface(1, 1)!;
    const paint = new kit.Paint(); paint.setColorFilter(filter);
    paint.setColor(kit.Color(parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)));
    surface.getCanvas().drawPaint(paint); surface.flush();
    const image = surface.makeImageSnapshot();
    const pixels = image.readPixels(0, 0, { width: 1, height: 1, colorType: kit.ColorType.RGBA_8888, alphaType: kit.AlphaType.Unpremul, colorSpace: kit.ColorSpace.SRGB })!;
    const result = Array.from(pixels).slice(0, 3);
    image.delete(); paint.delete(); surface.delete(); filter.delete();
    return result;
  };
  it('keeps roads brighter than grass at night and differentiates daytime terrain', () => {
    const grass = sample('A7CF7B', [0, 0, 1]);
    const road = sample('C4B594', [0, 0, 1]);
    expect(road.reduce((a, b) => a + b) - grass.reduce((a, b) => a + b)).toBeGreaterThan(80);
    const dayGrass = sample('A7CF7B', [1, 0, 0]), dayRoad = sample('C4B594', [1, 0, 0]);
    expect(dayGrass[1] - dayGrass[0]).toBeGreaterThan(30);
    expect(dayRoad[0] - dayGrass[0]).toBeGreaterThan(15);
  });
  it('retains alpha and finite coefficients throughout day/night transitions', () => {
    for (let altitude = -10; altitude < 10; altitude += .1) {
      const light = lightAtAltitude(altitude);
      const matrix = mapColorMatrix([light.day, light.dusk, light.night]);
      expect(matrix).toHaveLength(20);
      expect(matrix.every(Number.isFinite)).toBe(true);
      expect(matrix.slice(15)).toEqual([0, 0, 0, 1, 0]);
    }
  });
});
