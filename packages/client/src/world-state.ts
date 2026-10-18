import type { World } from '@breadcrumb/shared';

// Keep references for unchanged server data, so a five-second refresh does not
// invalidate map markers, location descriptions, and discovery filtering.
function reuse<T>(previous: T, next: T): T {
  return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
}
export function reconcileWorld(previous: World, next: World): World {
  const oldPresence = new Map(previous.presence.map(p => [p.id, p]));
  const presence = next.presence.map(p => {
    const old = oldPresence.get(p.id);
    return { ...p, moving: Boolean(old && (old.latitude !== p.latitude || old.longitude !== p.longitude)) };
  });
  const result = {
    ...next,
    profile: reuse(previous.profile, next.profile),
    crumbs: reuse(previous.crumbs, next.crumbs),
    friends: reuse(previous.friends, next.friends),
    presence: reuse(previous.presence, presence),
    communities: reuse(previous.communities, next.communities),
  };
  return Object.keys(result).every(key => result[key as keyof World] === previous[key as keyof World]) ? previous : result;
}
export function activeWorld(world: World, now: number): World {
  const presence = world.presence.filter(p => Date.parse(p.expires_at) > now);
  const crumbs = world.crumbs.filter(c => Date.parse(c.expires_at) > now);
  if (presence.length === world.presence.length && crumbs.length === world.crumbs.length) return world;
  return { ...world, presence, crumbs };
}
