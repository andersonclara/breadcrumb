import 'server-only';
import { createDemoReports, demoRemaining, distanceMeters, type DemoSession } from '@breadcrumb/shared';
import type { AskDependencies } from './agent';
import { recordSchema } from './schema';

export function withDemoSearch(search: Pick<AskDependencies, 'places' | 'search'>, session?: DemoSession) {
  if (!session) return search;
  const records = createDemoReports(session).map(r => recordSchema.parse(r));
  return {
    places: search.places,
    async search(...args: Parameters<AskDependencies['search']>) {
      const [constraints, window, origin, refs] = args;
      const real = await search.search(...args);
      // Re-check on every read, including the agent's read after explanation.
      if (!demoRemaining(session) || constraints.kind === 'events') return real;
      const tokens = (s: string) => s.toLowerCase().match(/[a-z0-9]+/g)?.map(t => t.replace(/s$/, '')) ?? [];
      const matches = records.filter(r => {
        if (refs && !refs.results.some(ref => ref.kind === r.kind && ref.id === r.id)) return false;
        if (Date.parse(r.createdAt!) >= Date.parse(window.end) || Date.parse(r.expiresAt!) <= Date.parse(window.start)) return false;
        if (constraints.freeOnly && r.priceType !== 'free') return false;
        if (constraints.freeFoodOnly && (r.category !== 'freebie' || !/\b(food|pizza|snacks?|cookies?|refreshments?|lunch|dinner|breakfast)\b/i.test(`${r.title} ${r.description??''}`))) return false;
        if (constraints.categories.length && !constraints.categories.some(c => c === r.category)) return false;
        const text = new Set(tokens(`${r.title} ${r.venue} ${r.category === 'freebie' ? 'free food snacks' : ''}`));
        return !constraints.terms.length || constraints.terms.some(term => tokens(term).every(token => text.has(token)));
      }).map(r => ({ ...r, distanceMeters: origin ? Math.round(distanceMeters(origin, { latitude: r.latitude!, longitude: r.longitude! })) : null }))
        .filter(r => r.distanceMeters === null || r.distanceMeters <= constraints.radiusMeters);
      return [...real, ...matches];
    },
  };
}
