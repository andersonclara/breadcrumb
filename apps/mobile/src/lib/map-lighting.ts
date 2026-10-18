export const mapLightProbes = [
  { id: 'off', label: 'Off' }, { id: 'solid', label: 'Dot' },
  { id: 'glow', label: 'Glow' }, { id: 'fixtures', label: 'Fixtures' },
  { id: 'appearance', label: 'Follow map' },
] as const;
export type MapLightProbeMode = typeof mapLightProbes[number]['id'];
export type MapLightProbe = {
  mode: 'solid' | 'glow';
  point: { x: number; y: number };
} | { mode: 'fixtures' | 'appearance' };

const automaticLighting: MapLightProbe = { mode: 'appearance' };

// Undefined follows the saved appearance; null is an explicit development Off.
// Release builds always use the normal appearance path.
export function mapLightConfig(probe: MapLightProbe | null | undefined, development: boolean) {
  return development && probe !== undefined ? probe : automaticLighting;
}

export function mapLightingOpacity(level: number, zoom: number) {
  if (!Number.isFinite(level) || !Number.isFinite(zoom)) return 0;
  const detail = Math.max(0, Math.min(1, (zoom - 4) / 4));
  return Math.max(0, Math.min(1, level)) * detail;
}

// Art-directed exterior scenery, not live fixture/venue status. These are the
// original University Avenue/landmark/stadium-perimeter anchors; no field lamps.
export const campusLamps = [
  ...Array.from({ length: 14 }, (_, i) => ({ x: 196 + i * 3.4, y: 37.18 + i * .013 })),
  ...[53, 60, 67].flatMap(y => [{ x: 190.2, y }, { x: 207.7, y: y - 1 }]),
  { x: 195, y: 72.4 }, { x: 202, y: 72.4 },
  { x: 233.8, y: 82.1 }, { x: 238.2, y: 82.1 },
  { x: 242, y: 53 }, { x: 246, y: 53 }, { x: 241.1, y: 73.2 },
];
