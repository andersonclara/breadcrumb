import { describe, expect, it } from 'vitest';
import { movePan, movePinch, panTouchAnchor } from '../apps/mobile/src/lib/map-touch';
import { panCamera, screenToWorld, zoomCamera } from '../apps/mobile/src/lib/map-gesture';

const size = { width: 390, height: 844 };
describe('continuous map touch transitions', () => {
  it('does not jump when a pinch begins with scale already above one', () => {
    const camera = { x: 140, y: 110, zoom: 12 };
    const event = { focalX: 120, focalY: 290, scale: 1.07, numberOfPointers: 2 };
    const start = movePinch(camera, null, event, size);
    expect(start.camera).toEqual(camera);
    expect(movePinch(camera, start.anchor, event, size).camera).toEqual(camera);
    const next = movePinch(camera, start.anchor, { ...event, focalX: 135, scale: 1.4 }, size).camera;
    expect(next.zoom).toBeCloseTo(12 * 1.4 / 1.07);
    const anchored = screenToWorld(next, { x: 135, y: 290 }, size);
    expect(anchored.x).toBeCloseTo(start.anchor!.point.x);
    expect(anchored.y).toBeCloseTo(start.anchor!.point.y);
  });
  it('ignores the final one-finger or invalid focal sample', () => {
    const camera = { x: 140, y: 110, zoom: 12 };
    const event = { focalX: 120, focalY: 290, scale: 1, numberOfPointers: 2 };
    const start = movePinch(camera, null, event, size);
    const next = movePinch(camera, start.anchor, { ...event, scale: 1.5 }, size);
    for (const patch of [{ numberOfPointers: 1, focalX: 0, focalY: 0 }, { scale: NaN }, { focalX: NaN }])
      expect(movePinch(next.camera, next.anchor, { ...event, ...patch }, size).camera).toEqual(next.camera);
  });
  it('rebases without moving when a third finger shifts the focal point', () => {
    const camera = { x: 140, y: 110, zoom: 12 };
    const event = { focalX: 120, focalY: 290, scale: 1, numberOfPointers: 2 };
    const start = movePinch(camera, null, event, size);
    const extraFinger = { ...event, focalX: 250, focalY: 410, scale: 1.3, numberOfPointers: 3 };
    const rebased = movePinch(camera, start.anchor, extraFinger, size);
    expect(rebased.camera).toEqual(camera);
    const next = movePinch(camera, rebased.anchor, { ...extraFinger, scale: 1.6, focalX: 260 }, size).camera;
    expect(next.zoom).toBeCloseTo(12 * 1.6 / 1.3);
  });
  it('continues a one-finger drag from the current position after lifting a pinch finger', () => {
    const camera = { x: 140, y: 110, zoom: 18 };
    const previous = { x: 100, y: 100, pointers: 2 };
    const single = { translationX: 240, translationY: 330, numberOfPointers: 1 };
    expect(movePan(camera, previous, single, size, false)).toEqual(camera);
    const next = movePan(camera, panTouchAnchor(single), { ...single, translationX: 248 }, size, false);
    expect(next).toEqual(panCamera(camera, { x: 8, y: 0 }, size));
    expect(movePan(camera, panTouchAnchor(single), { ...single, translationX: 248 }, size, true)).toEqual(camera);
  });
  it('supports two-finger panning before the pinch recognizer activates without double-applying pinch motion', () => {
    const camera = { x: 140, y: 110, zoom: 18 };
    const event = { translationX: 20, translationY: 30, numberOfPointers: 2 };
    const previous = { x: 10, y: 10, pointers: 2 };
    expect(movePan(camera, previous, event, size, false)).toEqual(panCamera(camera, { x: 10, y: 20 }, size));
    expect(movePan(camera, previous, event, size, true)).toEqual(camera);
  });
  it('drags gradually back from a center outside campus instead of clamping it instantly', () => {
    const edge = { x: 2, y: 2, zoom: 64 }, focal = { x: 350, y: 750 };
    const outside = zoomCamera(edge.zoom, 1 / 64, screenToWorld(edge, focal, size), focal, size);
    expect(outside.x).toBeLessThan(0);
    expect(outside.y).toBeLessThan(0);
    const next = panCamera(outside, { x: -4, y: -4 }, size);
    expect(next.x - outside.x).toBeCloseTo(4 * 320 / size.height);
    expect(next.y - outside.y).toBeCloseTo(4 * 320 / size.height);
    expect(next.x).toBeLessThan(0);
    expect(panCamera(outside, { x: 4, y: 4 }, size)).toEqual(outside);
  });
});
