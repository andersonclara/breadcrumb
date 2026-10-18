import { describe, expect, it } from "vitest";
import { cameraMatrix, screenToWorld, zoomCamera } from "../packages/shared/src/camera";
import { buildingArt } from "../packages/shared/src/building-art";
import type { PixelRect } from "../packages/shared/src/pixel";
import { spritePaths, spriteStrips } from "../apps/mobile/src/lib/map-sprites";
import { overlayPosition, sceneTransform, sceneViewport, shouldRefreshScene } from "../apps/mobile/src/lib/map-viewport";

function colorAt(pixels: readonly PixelRect[], x: number, y: number) {
  let color: string | undefined;
  for (const p of pixels) if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) color = p.color;
  return color;
}
describe("cached map compositing", () => {
  it.each([{ width: 390, height: 844 }, { width: 900, height: 500 }])(
    "keeps scenery, fixed-size overlays and hit coordinates aligned at %j", (size) => {
      const scene = { x: 135, y: 100, zoom: 12 };
      const viewport = sceneViewport(scene, size);
      for (const live of [scene, { x: 140, y: 110, zoom: 3 }, { x: 132, y: 104, zoom: 128 }]) {
        const transform = sceneTransform(live, scene, size);
        const baseScale = Math.max(size.width, size.height) * scene.zoom / 320;
        for (const point of [{ x: 135, y: 100 }, { x: 137.25, y: 102.8 }]) {
          const cached = { x: (point.x - viewport.left) * baseScale, y: (point.y - viewport.top) * baseScale };
          const composited = { x: cached.x * transform.scale + transform.x, y: cached.y * transform.scale + transform.y };
          const overlay = overlayPosition(point, live, size);
          expect(composited.x).toBeCloseTo(overlay.x);
          expect(composited.y).toBeCloseTo(overlay.y);
          const hit = screenToWorld(live, composited, size);
          expect(hit.x).toBeCloseTo(point.x);
          expect(hit.y).toBeCloseTo(point.y);
        }
      }
    });
  it("refreshes before the overscan is exhausted, including a pinch-out", () => {
    const scene = { x: 140, y: 100, zoom: 12 }, size = { width: 390, height: 844 };
    const span = 320 / scene.zoom;
    const width = span * size.width / Math.max(size.width, size.height);
    expect(shouldRefreshScene({ ...scene, x: scene.x + width * .1 }, scene, size)).toBe(false);
    const live = { ...scene, x: scene.x + width * .13, zoom: scene.zoom / 1.16 };
    expect(shouldRefreshScene(live, scene, size)).toBe(true);
    const viewport = sceneViewport(scene, size), matrix = cameraMatrix(live, size);
    expect(viewport.left * matrix[0] + matrix[4]).toBeLessThan(0);
    expect((viewport.left + viewport.worldWidth) * matrix[0] + matrix[4]).toBeGreaterThan(size.width);
    expect(viewport.top * matrix[3] + matrix[5]).toBeLessThan(0);
    expect((viewport.top + viewport.worldHeight) * matrix[3] + matrix[5]).toBeGreaterThan(size.height);
  });
  it("keeps a moving pinch focal point attached at both zoom limits", () => {
    const size = { width: 390, height: 844 }, point = { x: 133, y: 97 }, focal = { x: 175, y: 300 };
    for (const ratio of [.00001, 10000]) {
      const camera = zoomCamera(12, ratio, point, focal, size);
      expect(overlayPosition(point, camera, size)).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
      expect(overlayPosition(point, camera, size).x).toBeCloseTo(focal.x);
      expect(overlayPosition(point, camera, size).y).toBeCloseTo(focal.y);
    }
  });
});
describe("batched building artwork", () => {
  const samples = [
    [{ x: -1, y: .3, w: 7, h: 6, color: "#FF0000" }, { x: .7, y: 1.4, w: 2, h: 2.1, color: "#0000FF" },
      { x: 2, y: 2, w: 4, h: 1, color: "#FF0000" }],
    buildingArt({ id: "test-science", name: "Science", width: 2.4, height: 1.2, rise: .7 }).pixels,
    buildingArt({ id: "test-norman", name: "Norman Hall", width: 2.4, height: 1.2, rise: 1.8 }).pixels,
  ];
  it.each(samples.map((pixels, index) => ({ pixels, index })))("preserves painter order and fractional detail for sprite $index", ({ pixels }) => {
    const strips = spriteStrips(pixels);
    const xs = [...new Set(pixels.flatMap((p) => [p.x, p.x + p.w]))].sort((a, b) => a - b);
    const ys = [...new Set(pixels.flatMap((p) => [p.y, p.y + p.h]))].sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
      const x = (xs[i] + xs[i + 1]) / 2, y = (ys[j] + ys[j + 1]) / 2;
      expect(colorAt(strips, x, y)).toBe(colorAt(pixels, x, y));
    }
    expect(spritePaths(pixels).length).toBeLessThanOrEqual(new Set(pixels.map((p) => p.color)).size);
    expect(spritePaths(pixels)).toBe(spritePaths(pixels));
  });
});
