export type Point = { x: number; y: number };
export type MapSize = { width: number; height: number };
export type MapCamera = Point & { zoom: number };
export function cameraMatrix(
  camera: MapCamera,
  size: MapSize,
): [number, number, number, number, number, number] {
  "worklet";
  const s = (Math.max(size.width, size.height) * camera.zoom) / 320;
  return [
    s,
    0,
    0,
    s,
    size.width / 2 - camera.x * s,
    size.height / 2 - camera.y * s,
  ];
}
export function screenToWorld(
  camera: MapCamera,
  p: Point,
  size: MapSize,
): Point {
  "worklet";
  const [s, , , , tx, ty] = cameraMatrix(camera, size);
  return { x: (p.x - tx) / s, y: (p.y - ty) / s };
}
export function panCamera(
  camera: MapCamera,
  delta: Point,
  size: MapSize,
): MapCamera {
  "worklet";
  const s = 320 / camera.zoom / Math.max(size.width, size.height);
  return {
    ...camera,
    x: Math.max(0, Math.min(320, camera.x - delta.x * s)),
    y: Math.max(0, Math.min(320, camera.y - delta.y * s)),
  };
}
export function zoomCamera(
  startZoom: number,
  ratio: number,
  anchor: Point,
  midpoint: Point,
  size: MapSize,
): MapCamera {
  "worklet";
  const zoom = Math.max(1, Math.min(128, startZoom * ratio)),
    s = 320 / zoom / Math.max(size.width, size.height);
  return {
    zoom,
    x: anchor.x - (midpoint.x - size.width / 2) * s,
    y: anchor.y - (midpoint.y - size.height / 2) * s,
  };
}
export function needsSceneRefresh(next: MapCamera, previous: MapCamera) {
  "worklet";
  const span = 320 / previous.zoom;
  return (
    Math.abs(next.x - previous.x) > span * 0.2 ||
    Math.abs(next.y - previous.y) > span * 0.2 ||
    next.zoom / previous.zoom > 1.2 ||
    previous.zoom / next.zoom > 1.2
  );
}
export function pinchCamera(
  startZoom: number,
  startDistance: number,
  distance: number,
  anchor: Point,
  midpoint: Point,
  size: { width: number; height: number },
) {
  const zoom = Math.max(
    1,
    Math.min(128, (startZoom * distance) / Math.max(1, startDistance)),
  );
  const scale = 320 / zoom / Math.max(size.width, size.height);
  return {
    zoom,
    center: {
      x: Math.max(
        0,
        Math.min(320, anchor.x - (midpoint.x - size.width / 2) * scale),
      ),
      y: Math.max(
        0,
        Math.min(320, anchor.y - (midpoint.y - size.height / 2) * scale),
      ),
    },
  };
}
