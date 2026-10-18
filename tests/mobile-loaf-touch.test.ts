import { describe, expect, it } from 'vitest';
import { checkSliceGesture } from '@breadcrumb/shared';
import { loafTouchPoint } from '../apps/mobile/src/lib/loaf-touch';

describe('mobile loaf touch coordinates', () => {
  it.each([319, 384, 720])('accepts a quick swipe on a %d-point surface, including its release', width => {
    const frame = { x: 28, y: 390, w: width, h: width * 24 / 40 };
    const samples = [
      { x: 0.50, y: -0.05, t: 0 },
      { x: 0.51, y: 0.25, t: 32 },
      { x: 0.49, y: 0.65, t: 79 },
      { x: 0.50, y: 1.5, t: 140 },
    ];
    const trace = samples.map(p => loafTouchPoint({
      pageX: frame.x + 2 + (2 + p.x * 36) / 40 * (frame.w - 4),
      pageY: frame.y + 2 + (4 + p.y * 16) / 24 * (frame.h - 4),
      timestamp: 5000 + p.t,
    }, frame, 5000));

    expect(trace[trace.length - 1].y).toBe(1.2);
    // Before release there is neither enough evidence nor a full cut.
    expect(checkSliceGesture(0.5, trace.slice(0, -1)).ok).toBe(false);
    expect(checkSliceGesture(0.5, trace)).toEqual({ ok: true, cutAt: 0.5 });
  });

  it('uses page coordinates even when a move reports a different local target', () => {
    const touch = { pageX: 180, pageY: 510, timestamp: 1200, locationX: 2, locationY: 3 };
    const retargetedTouch = { ...touch, locationX: 150, locationY: 120 };
    const frame = { x: 28, y: 390, w: 304, h: 184 };
    expect(loafTouchPoint(touch, frame, 1000))
      .toEqual(loafTouchPoint(retargetedTouch, frame, 1000));
    expect(loafTouchPoint(touch, frame, 1000).t).toBe(200);
  });
});
