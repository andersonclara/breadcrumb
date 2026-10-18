import type { PixelRect } from "@breadcrumb/shared";

type Run = { x: number; right: number; color: string };
type Strip = PixelRect;
const cache = new WeakMap<readonly PixelRect[], Strip[]>();

// Resolve overlapping rectangles once, then batch the disjoint visible pieces
// by color. This keeps the original painter result (including fractional edges)
// while replacing hundreds of native SVG nodes with one path per color.
export function spriteStrips(pixels: readonly PixelRect[]): Strip[] {
  const cached = cache.get(pixels);
  if (cached) return cached;
  const ys = [...new Set(pixels.flatMap((p) => [p.y, p.y + p.h]))].sort(
    (a, b) => a - b,
  );
  const result: Strip[] = [];
  let previous = new Map<string, Strip>();
  for (let i = 0; i < ys.length - 1; i++) {
    const y = ys[i], bottom = ys[i + 1];
    let runs: Run[] = [];
    for (const p of pixels) {
      if (p.w <= 0 || p.h <= 0 || p.y > y || p.y + p.h < bottom) continue;
      const right = p.x + p.w;
      const next: Run[] = [];
      for (const r of runs) {
        if (r.right <= p.x || r.x >= right) next.push(r);
        else {
          if (r.x < p.x) next.push({ ...r, right: p.x });
          if (r.right > right) next.push({ ...r, x: right });
        }
      }
      next.push({ x: p.x, right, color: p.color });
      runs = next;
    }
    runs.sort((a, b) => a.x - b.x);
    const merged: Run[] = [];
    for (const r of runs) {
      const last = merged[merged.length - 1];
      if (last?.right === r.x && last.color === r.color) last.right = r.right;
      else merged.push({ ...r });
    }
    const current = new Map<string, Strip>();
    for (const r of merged) {
      const key = `${r.x}:${r.right}:${r.color}`;
      let strip = previous.get(key);
      if (strip && strip.y + strip.h === y) strip.h = bottom - strip.y;
      else {
        strip = { x: r.x, y, w: r.right - r.x, h: bottom - y, color: r.color };
        result.push(strip);
      }
      current.set(key, strip);
    }
    previous = current;
  }
  cache.set(pixels, result);
  return result;
}

const pathCache = new WeakMap<readonly PixelRect[], { color: string; path: string }[]>();
export function spritePaths(pixels: readonly PixelRect[]) {
  const cached = pathCache.get(pixels);
  if (cached) return cached;
  const colors = new Map<string, string[]>();
  for (const p of spriteStrips(pixels)) {
    const path = `M${p.x} ${p.y}h${p.w}v${p.h}h${-p.w}z`;
    const group = colors.get(p.color);
    if (group) group.push(path);
    else colors.set(p.color, [path]);
  }
  const result = [...colors].map(([color, paths]) => ({ color, path: paths.join("") }));
  pathCache.set(pixels, result);
  return result;
}
