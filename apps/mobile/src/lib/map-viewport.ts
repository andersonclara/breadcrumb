import type { MapCamera, MapSize, Point } from "@breadcrumb/shared";

export const SCENE_BUFFER = 1.6;
export const SCENE_INTERVAL_MS = 120;

export function sceneViewport(camera: MapCamera, size: MapSize) {
  const scale = Math.max(size.width, size.height) * camera.zoom / 320;
  const width = size.width * SCENE_BUFFER, height = size.height * SCENE_BUFFER;
  return { width, height, left: camera.x - width / scale / 2,
    top: camera.y - height / scale / 2, worldWidth: width / scale, worldHeight: height / scale };
}

export function sceneTransform(live: MapCamera, scene: MapCamera, size: MapSize) {
  "worklet";
  const scale = Math.max(size.width, size.height) * live.zoom / 320;
  const ratio = live.zoom / scene.zoom;
  return { scale: ratio,
    x: size.width / 2 + (scene.x - live.x) * scale - size.width * SCENE_BUFFER / 2 * ratio,
    y: size.height / 2 + (scene.y - live.y) * scale - size.height * SCENE_BUFFER / 2 * ratio };
}

export function overlayPosition(point: Point, camera: MapCamera, size: MapSize) {
  "worklet";
  const scale = Math.max(size.width, size.height) * camera.zoom / 320;
  return { x: (point.x - camera.x) * scale + size.width / 2,
    y: (point.y - camera.y) * scale + size.height / 2 };
}

export function shouldRefreshScene(next: MapCamera, previous: MapCamera, size: MapSize) {
  "worklet";
  const scale = Math.max(size.width, size.height) * previous.zoom / 320;
  // Portrait's horizontal buffer is narrower than its vertical one. Measure
  // against each viewport dimension so a quick sideways drag refreshes early.
  return Math.abs(next.x - previous.x) * scale > size.width * .12 ||
    Math.abs(next.y - previous.y) * scale > size.height * .12 ||
    next.zoom / previous.zoom > 1.25 || previous.zoom / next.zoom > 1.15;
}
