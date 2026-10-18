import {
  campus,
  campusScene,
  emptyWorld,
  hitBuildingSprite,
  type PixelRect,
} from "@breadcrumb/shared";
import type { MapCamera } from "./map-gesture";

export type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};
export type SceneBuilding = Extract<
  ReturnType<typeof campusScene>[number],
  { kind: "building" }
>;
const intersects = (a: Bounds, b: Bounds) =>
  a.left <= b.right &&
  a.right >= b.left &&
  a.top <= b.bottom &&
  a.bottom >= b.top;

// Build once, rather than reading all path coordinates on every camera update.
// Large features stay in a separate list to avoid filling thousands of cells.
export function createSpatialIndex<T>(
  items: readonly T[],
  boundsOf: (item: T) => Bounds,
  cellSize = 8,
) {
  const bounds = items.map(boundsOf),
    cells = new Map<string, number[]>(),
    large: number[] = [];
  bounds.forEach((b, index) => {
    const left = Math.floor(b.left / cellSize),
      right = Math.floor(b.right / cellSize),
      top = Math.floor(b.top / cellSize),
      bottom = Math.floor(b.bottom / cellSize);
    if ((right - left + 1) * (bottom - top + 1) > 256) {
      large.push(index);
      return;
    }
    for (let x = left; x <= right; x++)
      for (let y = top; y <= bottom; y++) {
        const key = `${x}:${y}`,
          cell = cells.get(key);
        if (cell) cell.push(index);
        else cells.set(key, [index]);
      }
  });
  return (viewport: Bounds): T[] => {
    const candidates = new Set(large);
    for (
      let x = Math.floor(viewport.left / cellSize);
      x <= Math.floor(viewport.right / cellSize);
      x++
    )
      for (
        let y = Math.floor(viewport.top / cellSize);
        y <= Math.floor(viewport.bottom / cellSize);
        y++
      ) {
        for (const index of cells.get(`${x}:${y}`) ?? []) candidates.add(index);
      }
    return [...candidates]
      .filter((i) => intersects(bounds[i], viewport))
      .sort((a, b) => a - b)
      .map((i) => items[i]);
  };
}

export function pointsBounds(
  points: readonly (readonly number[])[],
  padding = 0,
): Bounds {
  let left = Infinity,
    top = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const [x, y] of points) {
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  return {
    left: left - padding,
    top: top - padding,
    right: right + padding,
    bottom: bottom + padding,
  };
}

const terrain = campus.paths.flatMap((path, color) =>
  (path.match(/M[^M]+/g) ?? []).map((d) => {
    // The cached terrain is horizontal pixel strips. Keep unknown future shapes
    // conservatively visible instead of silently dropping them.
    const rect =
      /^M(-?[\d.]+) (-?[\d.]+)h(-?[\d.]+)v(-?[\d.]+)H-?[\d.]+z$/.exec(d);
    const bounds = rect
      ? pointsBounds([
          [+rect[1], +rect[2]],
          [+rect[1] + +rect[3], +rect[2] + +rect[4]],
        ])
      : { left: -400, top: -400, right: 800, bottom: 800 };
    return { path: d, color, bounds };
  }),
);
const queryTerrain = createSpatialIndex(terrain, (p) => p.bounds);
const queryRoads = createSpatialIndex(campus.roads, (road) => {
  // Generated roads contain absolute M/L coordinate pairs.
  const values = road.path.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  const points: number[][] = [];
  for (let i = 0; i < values.length; i += 2)
    points.push([values[i], values[i + 1]]);
  return pointsBounds(points, road.width / 2);
});
const queryWalkways = createSpatialIndex(campus.walkways, (p) =>
  pointsBounds(p.points, p.width / 2),
);
const queryGround = createSpatialIndex(campus.surfaces, (p) => p);
const buildings = campusScene(
  emptyWorld,
  false,
  0,
  null,
  { x: 160, y: 160 },
  2000,
).filter((o): o is SceneBuilding => o.kind === "building");
const queryBuildings = createSpatialIndex(buildings, (b) => ({
  left: b.x - b.width / 2,
  right: b.x + b.width / 2,
  top: b.y - (b.art ? b.artHeight : b.height + b.rise),
  bottom: b.y,
}));

function groupPaths<T>(
  items: T[],
  style: (item: T) => number,
  path: (item: T) => string,
) {
  const groups = new Map<number, string[]>();
  for (const item of items) {
    const key = style(item),
      group = groups.get(key);
    if (group) group.push(path(item));
    else groups.set(key, [path(item)]);
  }
  return [...groups].map(([style, paths]) => ({ style, path: paths.join("") }));
}

export function sceneBounds(camera: MapCamera, buffer = 2): Bounds {
  const radius = ((320 / camera.zoom) * buffer) / 2;
  return {
    left: camera.x - radius,
    right: camera.x + radius,
    top: camera.y - radius,
    bottom: camera.y + radius,
  };
}

export function queryMapScene(camera: MapCamera, buffer = 2) {
  const bounds = sceneBounds(camera, buffer);
  return {
    bounds,
    terrain: groupPaths(
      queryTerrain(bounds),
      (p) => p.color,
      (p) => p.path,
    ),
    roads: groupPaths(
      queryRoads(bounds),
      (p) => p.width,
      (p) => p.path,
    ),
    walkways: groupPaths(
      queryWalkways(bounds),
      (p) => p.width,
      (p) => p.path,
    ),
    buildings: queryBuildings(bounds),
    ground: queryGround(bounds),
  };
}

export function hitMapBuilding(point: { x: number; y: number }) {
  return hitBuildingSprite(point, queryBuildings({ left: point.x, right: point.x, top: point.y, bottom: point.y }));
}

// Merge consecutive rectangles of the same color, preserving painter order
// where later sprite pixels overlap earlier ones.
export function pixelPaths(pixels: readonly PixelRect[]) {
  const paths: { color: string; path: string }[] = [];
  for (const p of pixels) {
    const d = `M${p.x} ${p.y}h${p.w}v${p.h}h${-p.w}z`,
      last = paths[paths.length - 1];
    if (last?.color === p.color) last.path += d;
    else paths.push({ color: p.color, path: d });
  }
  return paths;
}
