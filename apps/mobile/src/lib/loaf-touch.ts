type Touch = { pageX: number; pageY: number; timestamp: number };
type Frame = { x: number; y: number; w: number; h: number };

// Use one surface origin even when the native event target changes mid-gesture.
// The SVG fills the area inside the surface's two-point border.
export function loafTouchPoint(touch: Touch, frame: Frame, startedAt: number) {
  const vx = (touch.pageX - frame.x - 2) / Math.max(1, frame.w - 4) * 40;
  const vy = (touch.pageY - frame.y - 2) / Math.max(1, frame.h - 4) * 24;
  return {
    x: (vx - 2) / 36,
    // Captured touches may finish outside the surface after crossing the loaf.
    y: Math.max(-0.2, Math.min(1.2, (vy - 4) / 16)),
    t: touch.timestamp - startedAt,
  };
}
