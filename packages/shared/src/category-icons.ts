import { categories, type CrumbCategory } from './constants';
import type { DiscoveryRecord } from './discovery';
import type { PixelRect } from './pixel';

export type PixelIconName = CrumbCategory | 'calendar' | 'warning';

// Hand-placed 16x16 icons in the same ink/cream palette as the avatars and
// bread. Later rects paint over earlier ones; arrays are built once so
// renderers can cache them by identity.
const ink = '#493E48', cream = '#FFF1DA';
type Rect = [x: number, y: number, w: number, h: number, color: string];
const rects = (list: Rect[]): PixelRect[] => list.map(([x, y, w, h, color]) => ({ x, y, w, h, color }));
// Outlined rows: ink one pixel wider on each side, then the fill on top.
const outlinedRows = (rows: [y: number, x: number, w: number][], fill: string): Rect[] => [
  ...rows.map(([y, x, w]): Rect => [x - 1, y, w + 2, 1, ink]),
  ...rows.map(([y, x, w]): Rect => [x, y, w, 1, fill]),
];

const calendar = rects([
  [2, 3, 12, 12, ink], [3, 4, 10, 10, cream], [3, 13, 10, 1, '#E3CFAE'],
  [3, 4, 10, 3, '#E0614A'], [3, 4, 10, 1, '#F28A6F'],
  [5, 1, 2, 4, ink], [9, 1, 2, 4, ink],
  [4, 8, 2, 2, '#C9B9A4'], [7, 8, 2, 2, '#C9B9A4'], [10, 8, 2, 2, '#C9B9A4'],
  [4, 11, 2, 2, '#C9B9A4'], [7, 11, 2, 2, '#C9B9A4'], [10, 11, 2, 2, '#E0614A'],
]);

const pizza = rects([
  [1, 1, 14, 1, ink], [1, 2, 1, 2, ink], [14, 2, 1, 2, ink],
  [2, 2, 12, 2, '#C9803A'], [2, 2, 12, 1, '#E6A85A'],
  ...outlinedRows([[4, 2, 12], [5, 3, 10], [6, 3, 10], [7, 4, 8], [8, 4, 8], [9, 5, 6], [10, 5, 6], [11, 6, 4], [12, 6, 4], [13, 7, 2]], '#FFC65A'),
  [7, 14, 2, 1, ink], [11, 5, 2, 1, '#F0A93E'], [10, 8, 1, 2, '#F0A93E'],
  [5, 5, 2, 2, '#C8463A'], [9, 6, 2, 2, '#C8463A'], [7, 9, 2, 2, '#C8463A'],
  [5, 5, 1, 1, '#E06A55'], [9, 6, 1, 1, '#E06A55'], [7, 9, 1, 1, '#E06A55'],
]);

const person = (x: number, y: number, shirt: string): Rect[] => [
  [x - 1, y + 6, 8, 10 - y, ink], [x, y + 7, 6, 9 - y, shirt], [x, y + 7, 6, 1, cream],
  [x, y, 6, 6, ink], [x + 1, y + 1, 4, 4, '#F1C7A0'], [x + 1, y + 1, 4, 1, '#382C2B'],
];
const crowd = rects([...person(1, 2, '#689ECB'), ...person(9, 2, '#68B67F'), ...person(5, 5, '#EE896A')]);

const cone = rects([
  [7, 1, 2, 1, ink],
  ...outlinedRows([[2, 7, 2], [3, 7, 2], [4, 6, 4], [5, 6, 4], [6, 5, 6], [7, 5, 6], [8, 4, 8], [9, 4, 8], [10, 3, 10], [11, 3, 10]], '#EE7A3A'),
  [6, 5, 4, 1, cream], [4, 9, 8, 1, cream], [7, 2, 1, 2, '#F7A060'], [5, 6, 1, 2, '#F7A060'],
  [1, 12, 14, 3, ink], [2, 12, 12, 2, '#7A6470'], [2, 12, 12, 1, '#9A8490'],
]);

const warning = rects([
  [7, 0, 2, 1, ink],
  ...outlinedRows(Array.from({ length: 13 }, (_, i): [number, number, number] => {
    const half = Math.floor((i + 2) / 2);
    return [i + 1, 8 - half, half * 2];
  }), '#F5C445'),
  [0, 14, 16, 1, ink], [2, 13, 12, 1, '#D9A12F'],
  [7, 5, 2, 5, ink], [7, 11, 2, 2, ink],
]);

const eye = rects([
  [5, 4, 6, 1, ink], [3, 5, 10, 1, ink], [2, 6, 12, 1, ink], [1, 7, 14, 2, ink], [2, 9, 12, 1, ink], [3, 10, 10, 1, ink], [5, 11, 6, 1, ink],
  [5, 5, 6, 1, cream], [3, 6, 10, 1, cream], [2, 7, 12, 2, cream], [3, 9, 10, 1, cream], [5, 10, 6, 1, cream],
  [6, 6, 4, 4, '#76628A'], [7, 5, 2, 6, '#76628A'], [6, 6, 1, 1, '#A08BB5'],
  [7, 7, 2, 2, ink], [8, 7, 1, 1, cream],
  [4, 2, 1, 2, ink], [7, 1, 2, 2, ink], [11, 2, 1, 2, ink],
]);

const icons: Record<PixelIconName, PixelRect[]> = {
  event: calendar, calendar, freebie: pizza, crowd, construction: cone, hazard: warning, warning, sighting: eye,
};

export function categoryIconPixels(name: PixelIconName): PixelRect[] {
  return icons[name] ?? pizza;
}

const categoryIds = new Set<string>(categories.map((c) => c.id));
export function iconForRecord(r: Pick<DiscoveryRecord, 'kind' | 'category'>): PixelIconName {
  if (r.kind === 'event') return 'calendar';
  return r.category && categoryIds.has(r.category) ? (r.category as CrumbCategory) : 'freebie';
}
