import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDemoReports, demoRemaining, DEMO_DURATION_MS, inCampus, reportHeatCells } from '@breadcrumb/shared';
import { recordSchema, askRequestSchema, defaultConstraints } from '../src/lib/ai/ask/schema';
vi.mock('server-only', () => ({}));
import { withDemoSearch } from '../src/lib/ai/ask/demo';
import { ask } from '../src/lib/ai/ask/agent';
import type { AskDependencies } from '../src/lib/ai/ask/agent';

const session = { startedAt: Date.parse('2026-10-18T18:00:00Z'), seed: 84219 };
const window = { start: new Date(session.startedAt - 60_000).toISOString(), end: new Date(session.startedAt + 86400_000).toISOString() };
const constraints = { ...defaultConstraints, time: { period: 'now' as const, date: null }, kind: 'crumbs' as const, freeOnly: true, categories: ['freebie' as const], terms: ['food', 'pizza', 'snacks'] };
afterEach(() => vi.useRealTimers());
const clock = () => { vi.useFakeTimers(); vi.setSystemTime(session.startedAt); };
const backend = () => ({ places: vi.fn().mockResolvedValue([]), search: vi.fn().mockResolvedValue([]) });

describe('temporary campus demo evidence', () => {
  it('creates 144 deterministic, distinct, valid on-campus reports with a dominant food category', () => {
    const reports = createDemoReports(session);
    expect(reports).toHaveLength(144);
    expect(reports).toEqual(createDemoReports(session));
    expect(new Set(reports.map(r => r.id)).size).toBe(144);
    expect(new Set(reports.map(r => r.category)).size).toBe(5);
    expect(reports.filter(r => r.category === 'freebie')).toHaveLength(90);
    for (const r of reports) {
      expect(recordSchema.safeParse(r).success).toBe(true);
      expect(inCampus({ latitude: r.latitude!, longitude: r.longitude! })).toBe(true);
      expect(r.source).toBe('demo');
      expect(r.sourceUrl).toBeNull();
      expect(Date.parse(r.expiresAt!)).toBe(session.startedAt + DEMO_DURATION_MS);
    }
    expect(createDemoReports({ ...session, seed: 42 })[0].id).not.toBe(reports[0].id);
  });
  it('expires by wall clock even if timers were suspended, and rejects far-future or invalid sessions', () => {
    expect(demoRemaining(session, session.startedAt)).toBe(300000);
    expect(demoRemaining(session, session.startedAt + 299999)).toBe(1);
    expect(demoRemaining(session, session.startedAt + 300000)).toBe(0);
    expect(demoRemaining(session, session.startedAt + 600000)).toBe(0);
    expect(demoRemaining(session, session.startedAt - 5001)).toBe(0);
    expect(demoRemaining({ ...session, seed: 0 }, session.startedAt)).toBe(0);
    expect(askRequestSchema.safeParse({ message: 'food', demo: { ...session, reports: [] } }).success).toBe(false);
  });
  it('encodes report counts rather than fake student attendance and excludes events/expired reports', () => {
    const reports = createDemoReports(session);
    const cells = reportHeatCells(reports, session.startedAt);
    expect(cells.length).toBeLessThanOrEqual(48);
    expect(cells.reduce((n, c) => n + c.count, 0)).toBe(144);
    expect(cells[0].count).toBeGreaterThan(15);
    expect(reportHeatCells(reports, session.startedAt + DEMO_DURATION_MS)).toEqual([]);
    expect(reportHeatCells(reports.map(r => ({ ...r, kind: 'event' as const })), session.startedAt)).toEqual([]);
    expect(reportHeatCells(reports.map(r => ({ ...r, confirmCount: 9999 })), session.startedAt)).toEqual(cells);
  });
  it('searches the same food evidence as the map, obeying category, distance, time and exact references', async () => {
    clock();
    const search = withDemoSearch(backend(), session);
    const results = await search.search(constraints, window, null);
    expect(results).toHaveLength(90);
    expect(results.every(r => createDemoReports(session).some(m => m.id === r.id))).toBe(true);
    const origin = { name: 'Reitz', aliases: [], latitude: results[0].latitude!, longitude: results[0].longitude! };
    const near = await search.search({ ...constraints, radiusMeters: 100 }, window, origin);
    expect(near.length).toBeGreaterThan(0);
    expect(near.length).toBeLessThan(90);
    expect(near.every(r => r.distanceMeters! <= 100)).toBe(true);
    expect(await search.search({ ...constraints, kind: 'events' }, window, null)).toEqual([]);
    expect(await search.search(constraints, { start: new Date(session.startedAt + 86400000).toISOString(), end: window.end }, null)).toEqual([]);
    const ref = { constraints, results: [{ kind: 'crumb' as const, id: results[0].id }], referencePlace: null };
    expect((await search.search(constraints, window, null, ref)).map(r => r.id)).toEqual([results[0].id]);
  });
  it('uses no simulated reports without an active session and removes them on a later read', async () => {
    clock();
    const real = backend();
    expect(withDemoSearch(real)).toBe(real);
    const search = withDemoSearch(real, session);
    expect((await search.search(constraints, window, null)).length).toBe(90);
    vi.setSystemTime(session.startedAt + DEMO_DURATION_MS);
    expect(await search.search(constraints, window, null)).toEqual([]);
  });
  it('labels AI demo answers and rechecks expiry after model generation', async () => {
    clock();
    const search = withDemoSearch(backend(), session);
    const interpret = vi.fn().mockResolvedValue({ action: 'search', clearLocation: false, clarification: null,
      patch: { ...constraints } });
    const explain = vi.fn<AskDependencies['explain']>(async (_message, _constraints, records) => ({ answer: 'Free pizza is reported near Reitz.', citations: [{ kind: 'crumb' as const, id: records[0].id }] }));
    const request = { message: 'Free food now', demo: session };
    const result = await ask(request, { ...search, interpret, explain }, new AbortController().signal, new Date());
    expect(result.answer).toMatch(/^Demo simulation:/);
    expect(result.cards[0].source).toBe('demo');
    explain.mockImplementationOnce(async (_message, _constraints, records) => {
      vi.setSystemTime(session.startedAt + DEMO_DURATION_MS);
      return { answer: 'Old availability', citations: [{ kind: 'crumb' as const, id: records[0].id }] };
    });
    const expired = await ask(request, { ...search, interpret, explain }, new AbortController().signal, new Date(session.startedAt));
    expect(expired.status).toBe('no_results');
    expect(expired.cards).toEqual([]);
    expect(expired.answer).not.toContain('Old availability');
  });
});
