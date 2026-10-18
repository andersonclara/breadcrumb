import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyWorld, fromWorld, toWorld } from '@breadcrumb/shared';
import { LiveMapLocation, type MapLocationFix, type MapLocationState } from '../apps/mobile/src/lib/live-map-location';
import { mapPeople } from '../apps/mobile/src/lib/map-catalog';

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
function setup() {
  let update!: (fix: MapLocationFix) => void;
  let fail!: () => void;
  const remove = vi.fn();
  const permission = vi.fn(async () => true);
  const watch = vi.fn(async (next: typeof update, error: typeof fail): Promise<{ remove: () => void }> => {
    update = next; fail = error;
    return { remove };
  });
  let state!: MapLocationState;
  const tracker = new LiveMapLocation({ permission, watch }, next => { state = next; });
  const fix = (x = 140, speed: number | null = 1.2, accuracy = 5): MapLocationFix => ({
    timestamp: Date.now(), coords: { ...fromWorld(x, 120), speed, accuracy },
  });
  return { tracker, permission, watch, remove, fix, update: (p: MapLocationFix) => update(p),
    fail: () => fail(), state: () => state };
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-17T12:00:00Z')); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('live avatar location', () => {
  it('moves the self avatar with successive GPS fixes while friend sharing is off', async () => {
    const s = setup();
    await s.tracker.start();
    s.update(s.fix());
    expect(s.state().walking).toBe(true);
    const first = mapPeople(emptyWorld, s.state().position).find(p => p.id === 'self')!;
    vi.advanceTimersByTime(2000);
    s.update(s.fix(140.2));
    const second = mapPeople(emptyWorld, s.state().position).find(p => p.id === 'self')!;
    expect(first.x).toBeCloseTo(140);
    expect(second.x).toBeCloseTo(140.2);
    expect(toWorld(s.state().position!).y).toBeCloseTo(120);
    expect(emptyWorld.presence).toEqual([]);
  });

  it('stops the walking animation when stationary or when updates pause', async () => {
    const s = setup(); await s.tracker.start();
    s.update(s.fix());
    vi.advanceTimersByTime(3500);
    expect(s.state().walking).toBe(false);
    s.update(s.fix(140.1));
    expect(s.state().walking).toBe(true);
    vi.advanceTimersByTime(1000);
    s.update(s.fix(140.1, 0));
    expect(s.state().walking).toBe(false);
  });

  it('hides stale or inaccurate readings instead of claiming they are current', async () => {
    const s = setup(); await s.tracker.start();
    s.update({ ...s.fix(), timestamp: Date.now() - 20000 });
    s.update(s.fix(140, 0, 800));
    expect(s.state().position).toBeNull();
    s.update(s.fix());
    vi.advanceTimersByTime(30000);
    expect(s.state()).toMatchObject({ position: null, walking: false, locating: false });
    expect(mapPeople(emptyWorld, s.state().position)).toEqual([]);
    s.update(s.fix(140.2));
    expect(s.state().position).not.toBeNull();
    expect(s.state().error).toBe('');
  });

  it('removes the marker outside campus and restores it upon returning', async () => {
    const s = setup(); await s.tracker.start();
    s.update(s.fix()); vi.advanceTimersByTime(1000);
    s.update({ ...s.fix(), coords: { latitude: 40, longitude: -74, speed: 1, accuracy: 5 } });
    expect(s.state().position).toBeNull();
    expect(s.state().error).toContain('outside the UF map');
    vi.advanceTimersByTime(1000); s.update(s.fix());
    expect(s.state().position).not.toBeNull();
  });

  it('releases GPS on leaving the map or backgrounding, and ignores late callbacks', async () => {
    const s = setup(); await s.tracker.start();
    s.update(s.fix()); s.tracker.stop();
    expect(s.remove).toHaveBeenCalledOnce();
    s.update(s.fix(141));
    expect(s.state().position).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not start a watcher if permission resolves after leaving the map', async () => {
    const s = setup();
    let grant!: (value: boolean) => void;
    s.permission.mockImplementation(() => new Promise(resolve => { grant = resolve; }));
    const pending = s.tracker.start();
    s.tracker.stop(); grant(true); await pending;
    expect(s.watch).not.toHaveBeenCalled();
  });

  it('cleans up a subscription that resolves after a newer watch started', async () => {
    const s = setup();
    let resolveOld!: (subscription: { remove: () => void }) => void;
    s.watch.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    const pending = s.tracker.start(); await flush();
    await s.tracker.start(true);
    const removeOld = vi.fn(); resolveOld({ remove: removeOld }); await pending;
    expect(removeOld).toHaveBeenCalledOnce();
    expect(s.remove).not.toHaveBeenCalled();
    s.tracker.stop(); expect(s.remove).toHaveBeenCalledOnce();
  });

  it('handles denied permission and watcher failure without leaving a stale avatar', async () => {
    const s = setup(); s.permission.mockResolvedValueOnce(false);
    await s.tracker.start();
    expect(s.watch).not.toHaveBeenCalled();
    expect(s.state()).toMatchObject({ locating: false, position: null });
    await s.tracker.start(true); s.update(s.fix()); s.fail();
    expect(s.remove).toHaveBeenCalledOnce();
    expect(s.state()).toMatchObject({ locating: false, position: null, walking: false });
    expect(s.state().error).toContain('retry');
  });
});
