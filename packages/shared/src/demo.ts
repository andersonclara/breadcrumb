import { campus, fromWorld } from './world';
import { isCurrentRecord, type DiscoveryRecord } from './discovery';

export const DEMO_DURATION_MS = 180_000;
export const DEMO_REPORT_COUNT = 144;
export type DemoSession = { startedAt: number; seed: number };
export const isDemoRecord = (r: Pick<DiscoveryRecord, 'source'>) => r.source === 'demo';
export const demoKey = (s: DemoSession | null) => s ? `${s.startedAt}:${s.seed}` : null;
export function demoRemaining(s: DemoSession | null, now = Date.now()) {
  if (!s || !Number.isSafeInteger(s.startedAt) || !Number.isInteger(s.seed) || s.seed < 1 ||
    s.seed > 0x7fffffff || s.startedAt > now + 5000) return 0;
  return Math.max(0, Math.min(DEMO_DURATION_MS, s.startedAt + DEMO_DURATION_MS - now));
}

const sites = [
  ['Reitz Student Union', 207, 99], ['Turlington Hall', 235, 76],
  ['Library West', 245, 54], ['Marston Science Library', 231, 83],
  ['Newell Hall', 227, 73], ['Norman Hall', 281, 96],
  ['Ben Hill Griffin Stadium', 196, 72], ['Communicore', 229, 147],
  ['Emerson Alumni Hall', 198, 44], ['Southwest Recreation Center', 72, 166],
  ['Harn Museum of Art', 48, 167], ['Lake Alice', 129, 145],
] as const;
const food = ['Free pizza slices', 'Free bagels and coffee', 'Free snacks at a club table',
  'Free tacos after a meetup', 'Free fruit and drinks', 'Free sandwiches', 'Free cookies and lemonade'];
const topics = {
  crowd: ['Busy study tables', 'Short coffee queue', 'A quiet study corner'],
  event: ['Student club meetup', 'Outdoor music practice', 'Pickup games'],
  construction: ['Walkway maintenance', 'Temporary path detour', 'Work near the sidewalk'],
  hazard: ['Slippery walkway', 'A puddle beside the path', 'Loose paving near the entrance'],
};

// A compact seed is shared with Ask; neither client-supplied report prose nor
// simulated rows are written to the database. Identical sessions produce identical evidence.
export function createDemoReports(session: DemoSession): DiscoveryRecord[] {
  let seed = session.seed >>> 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
  const hex = session.seed.toString(16).padStart(8, '0');
  const stamp = session.startedAt.toString(16).slice(-8).padStart(8, '0');
  return Array.from({ length: DEMO_REPORT_COUNT }, (_, i) => {
    const category = i < 90 ? 'freebie' : i < 108 ? 'crowd' : i < 126 ? 'event' : i < 135 ? 'construction' : 'hazard';
    // Three dense food clusters plus reports distributed across the wider campus.
    const site = sites[i < 72 ? i % 3 : Math.floor(random() * sites.length)];
    const spread = i < 72 ? 4 : 8;
    const x = Math.max(1, Math.min(campus.size - 1, site[1] + (random() - .5) * spread));
    const y = Math.max(1, Math.min(campus.size - 1, site[2] + (random() - .5) * spread));
    const options = category === 'freebie' ? food : topics[category];
    const confirmations = i < 72 ? 4 + Math.floor(random() * 18) : Math.floor(random() * 5);
    return {
      kind: 'crumb', id: `d3e00000-${hex.slice(0, 4)}-4${hex.slice(4, 7)}-8${hex.slice(7)}00-${stamp}${i.toString(16).padStart(4, '0')}`,
      title: `${options[i % options.length]} near ${site[0]}`,
      description: 'Simulated campus report for this three-minute demo. Food availability, activity, and confirmations are fictional.',
      category, venue: site[0], ...fromWorld(x, y), startsAt: null, endsAt: null,
      eventDate: null, allDay: false,
      createdAt: new Date(session.startedAt - Math.floor(random() * 600_000)).toISOString(),
      expiresAt: new Date(session.startedAt + DEMO_DURATION_MS).toISOString(),
      state: confirmations >= 4 ? 'full_loaf' : confirmations > 0 ? 'rising' : 'crumb',
      confirmCount: confirmations, disputeCount: 0, source: 'demo', sourceUrl: null,
      lastSyncedAt: null, priceText: category === 'freebie' ? 'Simulated free food' : null,
      priceType: category === 'freebie' ? 'free' : 'unknown', distanceMeters: null,
    };
  });
}

export type HeatCell = { key: string; x: number; y: number; count: number };
export function reportHeatCells(records: DiscoveryRecord[], now = Date.now()): HeatCell[] {
  const cells = new Map<string, HeatCell>();
  for (const r of records) {
    if (r.kind !== 'crumb' || !isCurrentRecord(r, now) || r.latitude === null || r.longitude === null) continue;
    const x = (r.longitude - campus.bounds.west) / (campus.bounds.east - campus.bounds.west) * campus.size;
    const y = (campus.bounds.north - r.latitude) / (campus.bounds.north - campus.bounds.south) * campus.size;
    if (!Number.isFinite(x + y) || x < 0 || x > campus.size || y < 0 || y > campus.size) continue;
    const key = `${Math.floor(x / 12)}:${Math.floor(y / 12)}`;
    const previous = cells.get(key);
    if (previous) {
      previous.x = (previous.x * previous.count + x) / (previous.count + 1);
      previous.y = (previous.y * previous.count + y) / (previous.count + 1);
      previous.count++;
    } else cells.set(key, { key, x, y, count: 1 });
  }
  return [...cells.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)).slice(0, 48);
}
